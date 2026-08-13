import type { ReactNode } from "react";
import { connection } from "next/server";

import { requireUser } from "@/lib/auth/session";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  await connection();
  await requireUser("/dashboard");
  return children;
}
