import { signOutAction } from "@/app/auth/actions";
import { AppShell } from "@/components/app-shell";
import { DashboardPreview } from "@/components/dashboard-preview";
import { requireUser } from "@/lib/auth/session";
import { connection } from "next/server";

export const metadata = { title: "Dashboard | RippleLab" };

export default async function DashboardPage() {
  await connection();
  const user = await requireUser("/dashboard");

  return (
    <AppShell activePath="/dashboard" userEmail={user.email} signOutAction={signOutAction}>
      <DashboardPreview />
    </AppShell>
  );
}
