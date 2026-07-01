import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ParentHome } from "@/components/sections/ParentHome";

export default async function ParentPage() {
  const user = await getSessionUser();
  if (user?.role === "STUDENT") redirect("/dashboard");
  return <ParentHome />;
}
