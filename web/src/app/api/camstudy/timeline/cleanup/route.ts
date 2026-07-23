import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

// Solid-black JPEGs compress to a tiny fraction of a real photo's size, so an
// entry whose every frame is under this many bytes is treated as a black/blank
// capture. Real photos (even dark ones, even downscaled timelapse frames) are
// comfortably larger, so legitimate records are left untouched.
const BLACK_MAX_BYTES = 6000;

function dataUrlBytes(url: string): number {
  const comma = url.indexOf(",");
  const b64 = comma >= 0 ? url.slice(comma + 1) : url;
  return Math.floor((b64.length * 3) / 4);
}

// Delete the caller's all-black (blank) camstudy timeline entries, across all
// dates. Returns how many were removed.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const entries = await prisma.timelineEntry.findMany({
    where: { ownerId: user.id },
    select: { id: true, photoUrls: true, camSessionId: true },
  });

  // Only old inline-base64 entries can be black here; frames stored in Blob are
  // short URLs (and black frames are already skipped before upload), so an entry
  // with any non-data URL is never flagged.
  const black = entries.filter(
    (e) => e.photoUrls.length > 0 && e.photoUrls.every((u) => u.startsWith("data:") && dataUrlBytes(u) < BLACK_MAX_BYTES)
  );
  const toDelete = black.map((e) => e.id);
  const affectedSessions = [...new Set(black.map((e) => e.camSessionId).filter((x): x is string => !!x))];

  if (toDelete.length) {
    await prisma.timelineEntry.deleteMany({ where: { id: { in: toDelete }, ownerId: user.id } });
  }

  // Drop sessions whose entries were all black (now empty) so the day's study
  // time / session count no longer include them.
  let removedSessions = 0;
  for (const sid of affectedSessions) {
    const remaining = await prisma.timelineEntry.count({ where: { camSessionId: sid } });
    if (remaining === 0) {
      const r = await prisma.camSession.deleteMany({ where: { id: sid, ownerId: user.id } });
      removedSessions += r.count;
    }
  }
  return NextResponse.json({ deleted: toDelete.length, removedSessions });
}
