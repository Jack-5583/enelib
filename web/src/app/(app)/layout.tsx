import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AppShell } from "@/components/shell/AppShell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/");

  return (
    <AppShell
      user={{
        id: user.id,
        name: user.name,
        role: user.role,
        schoolLabel: user.schoolLabel,
        phone: user.phone,
      }}
    >
      {children}
    </AppShell>
  );
}
