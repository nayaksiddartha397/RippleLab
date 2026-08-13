"use server";

import { redirect } from "next/navigation";

import { isAuthTestMode } from "@/lib/auth/test-mode";
import {
  beginTestRecovery,
  createTestAccount,
  signOutTestUser,
  updateTestPassword,
  verifyTestCredentials,
} from "@/lib/auth/test-session";
import type { AuthActionState } from "@/lib/auth/types";
import {
  recoverySchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/auth/validation";
import { getSiteUrl, getSupabasePublicConfig } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

function errorsFrom(result: { error: { flatten: () => { fieldErrors: Record<string, string[]> } } }) {
  return { fieldErrors: result.error.flatten().fieldErrors, status: "error" as const };
}

function providerUnavailable(): AuthActionState {
  return {
    message:
      "Authentication is not connected yet. Add the Supabase public URL and publishable key to .env.local.",
    status: "error",
  };
}

function safeNext(value: FormDataEntryValue | null) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//")
    ? value
    : "/dashboard";
}

export async function signInAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return errorsFrom(parsed);

  if (isAuthTestMode()) {
    const accepted = await verifyTestCredentials(parsed.data.email, parsed.data.password);
    if (!accepted) return { message: "Email or password is incorrect.", status: "error" };
  } else {
    if (!getSupabasePublicConfig()) return providerUnavailable();
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) return { message: "Email or password is incorrect.", status: "error" };
  }

  redirect(safeNext(formData.get("next")));
}

export async function signUpAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    confirmPassword: formData.get("confirmPassword"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) return errorsFrom(parsed);

  const credentials = { email: parsed.data.email, password: parsed.data.password };

  if (isAuthTestMode()) {
    await createTestAccount(credentials.email, credentials.password);
  } else {
    if (!getSupabasePublicConfig()) return providerUnavailable();
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signUp({
      ...credentials,
      options: { emailRedirectTo: `${getSiteUrl()}/auth/confirm?next=/dashboard` },
    });

    if (error) {
      return { message: "We could not create the account. Check the details and try again.", status: "error" };
    }

    if (!data.session) {
      redirect(`/auth/check-email?email=${encodeURIComponent(credentials.email)}`);
    }
  }

  redirect("/dashboard");
}

export async function requestRecoveryAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = recoverySchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return errorsFrom(parsed);

  if (isAuthTestMode()) {
    await beginTestRecovery(parsed.data.email);
  } else {
    if (!getSupabasePublicConfig()) return providerUnavailable();
    const supabase = await createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${getSiteUrl()}/auth/confirm?next=/auth/update-password`,
    });
    if (error) {
      return { message: "We could not send the recovery email. Please try again shortly.", status: "error" };
    }
  }

  return {
    message: "If an account exists for that email, a recovery link is on its way.",
    status: "success",
  };
}

export async function updatePasswordAction(
  _state: AuthActionState,
  formData: FormData,
): Promise<AuthActionState> {
  const parsed = updatePasswordSchema.safeParse({
    confirmPassword: formData.get("confirmPassword"),
    password: formData.get("password"),
  });
  if (!parsed.success) return errorsFrom(parsed);

  if (isAuthTestMode()) {
    const updated = await updateTestPassword(parsed.data.password);
    if (!updated) return { message: "This recovery link is no longer valid.", status: "error" };
  } else {
    if (!getSupabasePublicConfig()) return providerUnavailable();
    const supabase = await createClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) return { message: "This recovery link is invalid or expired.", status: "error" };
  }

  redirect("/dashboard?password=updated");
}

export async function signOutAction() {
  if (isAuthTestMode()) {
    await signOutTestUser();
  } else if (getSupabasePublicConfig()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }

  redirect("/auth/sign-in?signedOut=1");
}
