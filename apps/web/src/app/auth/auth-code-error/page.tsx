import Link from "next/link";

import { AuthLayout } from "@/components/auth/auth-layout";

export const metadata = { title: "Authentication link error | RippleLab" };

export default function AuthCodeErrorPage() {
  return (
    <AuthLayout eyebrow="Link unavailable" title="This authentication link did not work">
      <p className="auth-message auth-message--error" role="alert">The link may be invalid, expired or already used. Request a fresh recovery link or sign in again.</p>
      <div className="auth-error-actions">
        <Link className="button button--primary button--md" href="/auth/recovery">Request another link</Link>
        <Link href="/auth/sign-in">Return to sign in</Link>
      </div>
    </AuthLayout>
  );
}
