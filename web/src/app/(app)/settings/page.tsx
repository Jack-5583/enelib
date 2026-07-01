import { getSessionUser } from "@/lib/session";
import { Settings } from "@/components/sections/Settings";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) return null;
  return <Settings role={user.role} />;
}
