import type { Metadata } from "next";

import { AppShell } from "@/components/app-shell";
import { DesignSystemShowcase } from "@/components/design-system-showcase";

export const metadata: Metadata = {
  title: "RippleLab | Design system",
  description: "RippleLab's accessible foundations, components and state patterns.",
};

export default function DesignSystemPage() {
  return (
    <AppShell activePath="/design-system">
      <DesignSystemShowcase />
    </AppShell>
  );
}
