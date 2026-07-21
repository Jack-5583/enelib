import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { inclassContext, inclassFetchFile } from "@/lib/inclass";

// Streams an answer's image attachment through the lab's authenticated session.
// inclass file URLs aren't reliably public (session/hotlink-protected), so a
// direct <img src> from the browser can fail — we proxy it same-origin instead.
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
    if (!upstream.ok || !upstream.body) return NextResponse.json({ error: "upstream" }, { status: 502 });

    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    return new NextResponse(upstream.body, {
      status: 200,
      headers: {
        // Browsers sniff image bytes for <img>, so octet-stream still renders.
        "Content-Type": ct,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "fetch failed" }, { status: 502 });
  }
}
