import "server-only";

import { cookies } from "next/headers";

import { isAuthTestMode } from "@/lib/auth/test-mode";
import type { FinancialProfile, FinancialProfileDraft } from "@/lib/profile/types";

const TEST_PROFILE_COOKIE = "ripplelab-test-profile";

const cookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24,
  path: "/",
  sameSite: "lax" as const,
  secure: false,
};

function assertTestMode() {
  if (!isAuthTestMode()) throw new Error("Test profile persistence is disabled.");
}

export async function getTestProfile(): Promise<FinancialProfile | null> {
  if (!isAuthTestMode()) return null;
  const value = (await cookies()).get(TEST_PROFILE_COOKIE)?.value;
  if (!value) return null;

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as FinancialProfile;
  } catch {
    return null;
  }
}

export async function saveTestProfile(profile: FinancialProfileDraft) {
  assertTestMode();
  const saved: FinancialProfile = { ...profile, updatedAt: new Date().toISOString() };
  const value = Buffer.from(JSON.stringify(saved)).toString("base64url");
  (await cookies()).set(TEST_PROFILE_COOKIE, value, cookieOptions);
  return saved;
}
