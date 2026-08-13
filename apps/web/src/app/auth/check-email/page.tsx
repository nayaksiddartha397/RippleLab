import Link from "next/link";

import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata = { title: "Check your email | RippleLab" };

export default async function CheckEmailPage({ searchParams }: { searchParams: Promise<{ email?: string }> }) {
  const { email } = await searchParams;
  return (
    <AuthLayout eyebrow="One more step" title="Check your email">
      <div className="auth-confirmation" role="status">
        <span aria-hidden="true">✓</span>
        <p>We sent a confirmation link{email ? ` to ${email}` : ""}. Open it in this browser to finish creating your account.</p>
      </div>
      <p className="auth-switch"><Link href="/auth/sign-in">Return to sign in</Link></p>
    </AuthLayout>
  );
}
