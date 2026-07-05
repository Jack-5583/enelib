import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { Questions } from "@/components/sections/Questions";

export default async function QuestionsPage() {
  const user = await getSessionUser();
  if (user?.role === "PARENT") redirect("/parent");
  return <Questions />;
}
