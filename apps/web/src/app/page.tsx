import { AppShell } from "@/components/app-shell";
import { DashboardPreview } from "@/components/dashboard-preview";

export default function Home() {
  return (
    <AppShell activePath="/">
      <DashboardPreview />
    </AppShell>
  );
}
