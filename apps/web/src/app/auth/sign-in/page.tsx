import Link from "next/link";

import { signInAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const metadata = { title: "Sign in | RippleLab" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; signedOut?: string }>;
}) {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const query = await searchParams;
  const next = query.next?.startsWith("/") && !query.next.startsWith("//") ? query.next : "/dashboard";

  return (
    <AuthLayout eyebrow="Welcome back" title="Sign in to your workspace">
      {query.signedOut === "1" ? (
        <p className="auth-message auth-message--success" role="status">You have been signed out safely.</p>
      ) : null}
      <p className="auth-panel__intro">Continue to your private financial profile and saved scenarios.</p>
      <AuthForm
        action={signInAction}
        fields={[
          { autoComplete: "email", label: "Email address", name: "email", placeholder: "you@example.com", type: "email" },
          { autoComplete: "current-password", label: "Password", name: "password", type: "password" },
        ]}
        next={next}
        secondary={{ href: "/auth/recovery", label: "Forgot password?" }}
        submitLabel="Sign in"
      />
      <p className="auth-switch">New to RippleLab? <Link href="/auth/sign-up">Create an account</Link></p>
    </AuthLayout>
  );
}
