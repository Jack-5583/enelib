import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { inclassContext, inclassUploadImage, InclassError } from "@/lib/inclass";

// Upload one photo for an inclass question. Runs the inclass upload+save flow on
// the lab's shared account and returns the form references + preview URL; the
// client collects these and sends them with the question on submit.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  if (user.role !== "STUDENT") return NextResponse.json({ error: "학생 계정만 사용할 수 있습니다." }, { status: 403 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  const labId = String(form?.get("labId") ?? "");
  const boardId = String(form?.get("boardId") ?? "");
  if (!(file instanceof File)) return NextResponse.json({ error: "이미지를 선택해주세요." }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "이미지 파일만 업로드할 수 있습니다." }, { status: 400 });
  if (file.size > 20 * 1024 * 1024) return NextResponse.json({ error: "파일 크기가 20MB를 초과했습니다." }, { status: 400 });

  try {
    const ctx = inclassContext(labId, boardId);
    const buffer = Buffer.from(await file.arrayBuffer());
    const att = await inclassUploadImage(ctx, {
      buffer,
      filename: file.name || "image.png",
      contentType: file.type,
    });
    return NextResponse.json(att);
  } catch (err) {
    const message = err instanceof InclassError ? err.message : "이미지 업로드에 실패했습니다.";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
