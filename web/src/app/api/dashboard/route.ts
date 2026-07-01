import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { computeDashboardStats } from "@/lib/stats";
import { getDday, formatDdayTargetLabel, formatTodayLabel } from "@/lib/dday";
import { todayQuote } from "@/lib/quotes";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const stats = await computeDashboardStats(user.id);
  const { dday, target } = getDday();
  const q = todayQuote();

  return NextResponse.json({
    userName: user.name,
    todayLabel: formatTodayLabel(),
    ddayTargetLabel: formatDdayTargetLabel(target),
    dday,
    quote: q.text,
    quoteAuthor: q.author,
    ...stats,
  });
}
