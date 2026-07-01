import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { Camstudy } from "@/components/sections/Camstudy";

export default async function CamstudyPage() {
  const user = await getSessionUser();
  if (user?.role === "PARENT") redirect("/parent");
  return <Camstudy />;
}
