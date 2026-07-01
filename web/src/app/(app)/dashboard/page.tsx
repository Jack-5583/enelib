import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { Dashboard } from "@/components/sections/Dashboard";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (user?.role === "PARENT") redirect("/parent");
  return <Dashboard />;
}
