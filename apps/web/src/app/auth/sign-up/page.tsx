import Link from "next/link";
import { redirect } from "next/navigation";

import { signUpAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = { title: "Create account | RippleLab" };

export default async function SignUpPage() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  return (
    <AuthLayout eyebrow="Start your private workspace" title="Create your account">
      <p className="auth-panel__intro">Use an email you can access. Hosted accounts require email confirmation.</p>
      <AuthForm
        action={signUpAction}
        fields={[
          { autoComplete: "email", label: "Email address", name: "email", placeholder: "you@example.com", type: "email" },
          { autoComplete: "new-password", hint: "At least 12 characters with a letter and number.", label: "Password", minLength: 12, name: "password", type: "password" },
          { autoComplete: "new-password", label: "Confirm password", minLength: 12, name: "confirmPassword", type: "password" },
        ]}
        submitLabel="Create account"
      />
      <p className="auth-terms">By continuing, you accept that RippleLab provides educational estimates, not financial advice.</p>
      <p className="auth-switch">Already have an account? <Link href="/auth/sign-in">Sign in</Link></p>
    </AuthLayout>
  );
}
