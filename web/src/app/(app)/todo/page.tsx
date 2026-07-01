import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { Todo } from "@/components/sections/Todo";

export default async function TodoPage() {
  const user = await getSessionUser();
  if (user?.role === "PARENT") redirect("/parent");
  return <Todo />;
}
