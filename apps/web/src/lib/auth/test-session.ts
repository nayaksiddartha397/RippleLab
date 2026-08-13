import "server-only";

import { createHash } from "node:crypto";
import { cookies } from "next/headers";

import {
  isAuthTestMode,
  TEST_ACCOUNT_COOKIE,
  TEST_SESSION_COOKIE,
} from "@/lib/auth/test-mode";

type TestAccount = {
  email: string;
  passwordHash: string;
};

const cookieOptions = {
  httpOnly: true,
  maxAge: 60 * 60 * 24,
  path: "/",
  sameSite: "lax" as const,
  secure: false,
};

function encode(value: unknown) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function decode<T>(value: string | undefined): T | null {
  if (!value) return null;

  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function assertTestMode() {
  if (!isAuthTestMode()) throw new Error("Test authentication is disabled.");
}

export async function createTestAccount(email: string, password: string) {
  assertTestMode();
  const cookieStore = await cookies();
  const normalizedEmail = email.toLowerCase();
  const account: TestAccount = { email: normalizedEmail, passwordHash: hashPassword(password) };

  cookieStore.set(TEST_ACCOUNT_COOKIE, encode(account), cookieOptions);
  cookieStore.set(TEST_SESSION_COOKIE, encode({ email: normalizedEmail }), cookieOptions);
}

export async function verifyTestCredentials(email: string, password: string) {
  assertTestMode();
  const cookieStore = await cookies();
  const account = decode<TestAccount>(cookieStore.get(TEST_ACCOUNT_COOKIE)?.value);

  if (
    !account ||
    account.email !== email.toLowerCase() ||
    account.passwordHash !== hashPassword(password)
  ) {
    return false;
  }

  cookieStore.set(TEST_SESSION_COOKIE, encode({ email: account.email }), cookieOptions);
  return true;
}

export async function getTestUser() {
  if (!isAuthTestMode()) return null;
  const cookieStore = await cookies();
  return decode<{ email: string }>(cookieStore.get(TEST_SESSION_COOKIE)?.value);
}

export async function signOutTestUser() {
  assertTestMode();
  (await cookies()).delete(TEST_SESSION_COOKIE);
}

export async function beginTestRecovery(email: string) {
  assertTestMode();
  const cookieStore = await cookies();
  const account = decode<TestAccount>(cookieStore.get(TEST_ACCOUNT_COOKIE)?.value);

  if (account?.email === email.toLowerCase()) {
    cookieStore.set(TEST_SESSION_COOKIE, encode({ email: account.email }), cookieOptions);
  }
}

export async function updateTestPassword(password: string) {
  assertTestMode();
  const cookieStore = await cookies();
  const account = decode<TestAccount>(cookieStore.get(TEST_ACCOUNT_COOKIE)?.value);
  const user = decode<{ email: string }>(cookieStore.get(TEST_SESSION_COOKIE)?.value);

  if (!account || !user || account.email !== user.email) return false;

  cookieStore.set(
    TEST_ACCOUNT_COOKIE,
    encode({ ...account, passwordHash: hashPassword(password) }),
    cookieOptions,
  );
  return true;
}
