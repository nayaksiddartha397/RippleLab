import { signOutAction } from "@/app/auth/actions";
import { AppShell } from "@/components/app-shell";
import { DashboardPreview } from "@/components/dashboard-preview";
import { requireUser } from "@/lib/auth/session";
import { getFinancialProfile } from "@/lib/profile/data";
import { connection } from "next/server";

export const metadata = { title: "Dashboard | RippleLab" };

export default async function DashboardPage() {
  await connection();
  const user = await requireUser("/dashboard");
  const profile = await getFinancialProfile(user.id);

  return (
    <AppShell activePath="/dashboard" userEmail={user.email} signOutAction={signOutAction}>
      <DashboardPreview profile={profile} />
    </AppShell>
  );
}
