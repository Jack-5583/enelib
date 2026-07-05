import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { QuestionsHome } from "@/components/sections/QuestionsHome";

export default async function QuestionsPage() {
  const user = await getSessionUser();
  if (user?.role === "PARENT") redirect("/parent");
  return <QuestionsHome />;
}
