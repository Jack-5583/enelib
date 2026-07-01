import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

export async function GET() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  return NextResponse.json({
    id: user.id,
    phone: user.phone,
    role: user.role,
    name: user.name,
    schoolLabel: user.schoolLabel,
    notificationSettings: user.notificationSettings,
  });
}
