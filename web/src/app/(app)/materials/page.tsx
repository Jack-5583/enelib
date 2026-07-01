import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { Materials } from "@/components/sections/Materials";

export default async function MaterialsPage() {
  const user = await getSessionUser();
  if (user?.role === "PARENT") redirect("/parent");
  return <Materials />;
}
