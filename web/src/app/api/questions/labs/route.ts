import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { RESEARCH_LABS } from "@/lib/researchLabs";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  return NextResponse.json(
    RESEARCH_LABS.map((l) => ({
      id: l.id,
      name: l.name,
      subject: l.subject,
      kind: l.kind,
      boards: l.boards.map((b) => ({ id: b.id, name: b.name })),
    }))
  );
}
