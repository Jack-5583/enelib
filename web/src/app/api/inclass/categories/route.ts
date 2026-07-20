import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { getResearchLabBoard } from "@/lib/researchLabs";
import { inclassContext, inclassFetchCategories } from "@/lib/inclass";

// Returns the 분류(groupCode) options for an inclass board (empty if the board
// has no category dropdown). Read live from the board's write page.
export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const labId = req.nextUrl.searchParams.get("labId") ?? "";
  const boardId = req.nextUrl.searchParams.get("boardId") ?? "";
  if (!getResearchLabBoard(labId, boardId)) return NextResponse.json({ categories: [] });

  try {
    const ctx = inclassContext(labId, boardId);
    const categories = await inclassFetchCategories(ctx);
    return NextResponse.json({ categories });
  } catch {
    return NextResponse.json({ categories: [] });
  }
}
