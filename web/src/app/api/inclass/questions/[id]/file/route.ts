import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { inclassContext, inclassFetchFile } from "@/lib/inclass";

// Sniff an image's real type from its leading bytes. inclass serves board
// files as a download (octet-stream + attachment), which a browser won't
// render in <img>; we detect the type and re-serve it inline instead.
function sniffImageType(b: Buffer): string | null {
  if (b.length < 12) return null;
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50)
    return "image/webp";
  if (b[0] === 0x42 && b[1] === 0x4d) return "image/bmp";
  // ISO-BMFF (HEIC/HEIF): "ftyp" at offset 4
  if (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) return "image/heic";
  return null;
}

// Streams an answer's image attachment through the lab's authenticated session,
// forced inline as an image so it renders same-origin in the app.
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const q = await prisma.inclassQuestion.findUnique({ where: { id } });
  if (!q || q.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const i = Number(req.nextUrl.searchParams.get("i") ?? "0");
  const fileUrl = q.answerImages[i];
  if (!fileUrl) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const ctx = inclassContext(q.labId ?? "parkjongmin", q.boardId ?? undefined);
    const upstream = await inclassFetchFile(ctx, fileUrl);
    if (!upstream.ok) return NextResponse.json({ error: "upstream", status: upstream.status }, { status: 502 });

    const buf = Buffer.from(await upstream.arrayBuffer());
    const upstreamCt = upstream.headers.get("content-type") || "";
    const ct = sniffImageType(buf) || (upstreamCt.startsWith("image/") ? upstreamCt : "image/jpeg");

    return new NextResponse(buf, {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Content-Disposition": "inline",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
