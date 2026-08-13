import Link from "next/link";
import type { ReactNode } from "react";

export function AuthLayout({
  children,
  eyebrow,
  title,
}: {
  children: ReactNode;
  eyebrow: string;
  title: string;
}) {
  return (
    <main className="auth-page">
      <section className="auth-story" aria-label="RippleLab account context">
        <Link className="auth-brand" href="/">
          <span aria-hidden="true" className="brand-mark">R</span>
          <span>
            <strong>RippleLab</strong>
            <small>economic digital twin</small>
          </span>
        </Link>
        <div>
          <p className="eyebrow">Private by default</p>
          <h1>Your finances deserve a protected workspace.</h1>
          <p>
            Your profile and scenarios will stay connected to your account. Reports omit sensitive
            details unless you explicitly include them.
          </p>
        </div>
        <p className="auth-story__note">Educational simulation. Not financial advice.</p>
      </section>

      <section className="auth-panel">
        <div className="auth-panel__inner">
          <p className="eyebrow">{eyebrow}</p>
          <h2>{title}</h2>
          {children}
        </div>
      </section>
    </main>
  );
}
