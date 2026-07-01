import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AuthScreen } from "@/components/auth/AuthScreen";

export default async function Home() {
  const user = await getSessionUser();
  if (user) {
    redirect(user.role === "PARENT" ? "/parent" : "/dashboard");
  }
  return <AuthScreen />;
}
