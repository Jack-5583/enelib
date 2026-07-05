import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { hohoonUploadImage, HohoonError } from "@/lib/hohoon";

export const runtime = "nodejs";

// Upload one image into the draft's shared imgcode folder on hohoonmath, and
// remember its web path so the submit can embed it in the article body.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const draft = await prisma.hohoonDraft.findUnique({ where: { id } });
  if (!draft || draft.ownerId !== user.id) return NextResponse.json({ error: "not found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof Blob)) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "이미지는 10MB 이하만 가능합니다." }, { status: 400 });

  const filename = (file instanceof File && file.name) || `image_${Date.now()}.png`;
  const contentType = file.type || "image/png";
  const buffer = Buffer.from(await file.arrayBuffer());

  try {
    const path = await hohoonUploadImage(draft.phpsessid, draft.imgcode, { buffer, filename, contentType });
    await prisma.hohoonDraft.update({
      where: { id: draft.id },
      data: { imagePaths: { push: path } },
    });
    return NextResponse.json({ path });
  } catch (err) {
    const message = err instanceof HohoonError ? err.message : "이미지 업로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
