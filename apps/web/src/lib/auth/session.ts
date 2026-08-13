import "server-only";

import { redirect } from "next/navigation";

import { getTestUser } from "@/lib/auth/test-session";
import { isAuthTestMode } from "@/lib/auth/test-mode";
import { getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

export type AuthUser = {
  email: string;
  id: string;
};

export async function getCurrentUser(): Promise<AuthUser | null> {
  if (isAuthTestMode()) {
    const user = await getTestUser();
    return user ? { email: user.email, id: "test-user" } : null;
  }

  if (!getSupabasePublicConfig()) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) return null;
  return { email: user.email, id: user.id };
}

export async function requireUser(next = "/dashboard") {
  const user = await getCurrentUser();
  if (!user) redirect(`/auth/sign-in?next=${encodeURIComponent(next)}`);
  return user;
}
