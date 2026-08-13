import Link from "next/link";

import { requestRecoveryAction } from "@/app/auth/actions";
import { AuthForm } from "@/components/auth/auth-form";
import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata = { title: "Recover account | RippleLab" };

export default function RecoveryPage() {
  return (
    <AuthLayout eyebrow="Account recovery" title="Reset your password">
      <p className="auth-panel__intro">Enter your account email. For privacy, the response is the same whether or not an account exists.</p>
      <AuthForm
        action={requestRecoveryAction}
        fields={[{ autoComplete: "email", label: "Email address", name: "email", placeholder: "you@example.com", type: "email" }]}
        submitLabel="Send recovery link"
      />
      <p className="auth-switch"><Link href="/auth/sign-in">Return to sign in</Link></p>
    </AuthLayout>
  );
}
