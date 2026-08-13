import Link from "next/link";

import { getCurrentUser } from "@/lib/auth/session";

export default async function Home() {
  const user = await getCurrentUser();

  return (
    <main className="public-home">
      <nav className="public-nav" aria-label="Public navigation">
        <Link className="auth-brand" href="/">
          <span aria-hidden="true" className="brand-mark">R</span>
          <span><strong>RippleLab</strong><small>economic digital twin</small></span>
        </Link>
        <div>
          {user ? (
            <Link className="button button--primary button--md" href="/dashboard">Open dashboard</Link>
          ) : (
            <>
              <Link href="/auth/sign-in">Sign in</Link>
              <Link className="button button--primary button--md" href="/auth/sign-up">Create account</Link>
            </>
          )}
        </div>
      </nav>
      <section className="public-hero">
        <div>
          <p className="eyebrow">India-focused economic simulation</p>
          <h1>See how the economy could ripple through your finances.</h1>
          <p>Build a private financial profile, explore supported policy scenarios and trace every estimate back to its assumptions.</p>
          <div className="public-hero__actions">
            <Link className="button button--primary button--md" href={user ? "/dashboard" : "/auth/sign-up"}>{user ? "Open your workspace" : "Create your private workspace"}</Link>
            <Link className="button button--secondary button--md" href="/design-system">Explore the interface</Link>
          </div>
        </div>
        <div className="public-proof" aria-label="RippleLab trust principles">
          <span>Deterministic calculations</span>
          <span>Inspectable assumptions</span>
          <span>Private by default</span>
        </div>
      </section>
    </main>
  );
}
