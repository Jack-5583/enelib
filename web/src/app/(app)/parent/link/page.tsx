import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { ParentLink } from "@/components/sections/ParentLink";

export default async function ParentLinkPage() {
  const user = await getSessionUser();
  if (user?.role === "STUDENT") redirect("/dashboard");
  return <ParentLink />;
}
