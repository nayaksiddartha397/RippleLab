import Link from "next/link";

const days = [
  { day: 1, title: "MVP foundation", detail: "Monorepo, Next.js, FastAPI, shared checks and product boundaries.", state: "complete" },
  { day: 2, title: "Interface system", detail: "Responsive shell, design tokens, reusable states and accessibility baseline.", state: "complete" },
  { day: 3, title: "Private accounts", detail: "Supabase-ready authentication, recovery and protected dashboard routing.", state: "complete" },
  { day: 4, title: "Financial profile", detail: "Five-step economic digital twin with validation, persistence and row ownership.", state: "complete" },
  { day: 5, title: "Simulation contract", detail: "Versioned scenarios, evidence, assumptions, confidence and causal graph types.", state: "complete" },
  { day: 6, title: "Calculation primitives", detail: "EMI, deposits, Decimal-safe money and formula-level verification.", state: "next" },
  { day: 7, title: "First live scenario", detail: "Profile-to-repo-rate end-to-end simulation and impact summary.", state: "planned" },
] as const;

export const metadata = { title: "Build progress | RippleLab" };

export default function ProgressPage() {
  return (
    <main className="progress-page">
      <nav className="public-nav" aria-label="Public navigation">
        <Link className="auth-brand" href="/">
          <span aria-hidden="true" className="brand-mark">R</span>
          <span><strong>RippleLab</strong><small>economic digital twin</small></span>
        </Link>
        <div><Link href="/design-system">Interface</Link><Link className="button button--primary button--md" href="/auth/sign-up">Create account</Link></div>
      </nav>

      <section className="progress-hero">
        <div>
          <p className="eyebrow">30-day MVP build</p>
          <h1>Five foundations built. The first calculation comes next.</h1>
          <p>RippleLab is 5 days into a structured 30-day build. The private profile and trustworthy data contract now exist; Day 6 begins the deterministic economic engine.</p>
        </div>
        <div className="progress-score" aria-label="Five of thirty days complete">
          <strong>5</strong><span>of 30 days</span><div><i style={{ width: "16.67%" }} /></div><small>Week 1 foundation</small>
        </div>
      </section>

      <section aria-labelledby="delivered-heading" className="progress-delivered">
        <header><p className="eyebrow">Delivered so far</p><h2 id="delivered-heading">A working product spine, not a visual mockup.</h2></header>
        <div className="progress-principles">
          <article><strong>Private profile</strong><span>Household cash flow, assets, housing, debt and goals.</span></article>
          <article><strong>Exact units</strong><span>Integer paise, basis points and scenario-specific shock units.</span></article>
          <article><strong>Evidence ready</strong><span>Citations, assumptions and confidence attach to causal links.</span></article>
        </div>
      </section>

      <section className="progress-timeline" aria-label="Week one progress">
        {days.map((item) => (
          <article className={`progress-day progress-day--${item.state}`} key={item.day}>
            <div><span>Day {item.day}</span><i aria-hidden="true">{item.state === "complete" ? "✓" : item.state === "next" ? "→" : "·"}</i></div>
            <h2>{item.title}</h2><p>{item.detail}</p>
            <small>{item.state === "complete" ? "Complete" : item.state === "next" ? "Up next" : "Planned"}</small>
          </article>
        ))}
      </section>

      <section className="progress-contract">
        <div><p className="eyebrow">Day 5 contract</p><h2>Every future number must explain itself.</h2><p>The result model now requires model versions, annual impact in paise, uncertainty bounds, assumptions, citations and a scored confidence rationale.</p></div>
        <div aria-label="Illustrative causal contract" className="progress-causal">
          <span>Repo rate</span><b>basis points</b><i>→</i><span>Loan rate</span><b>assumption + source</b><i>→</i><span>Your EMI</span><b>impact + confidence</b>
        </div>
      </section>

      <footer className="progress-footer"><p>RippleLab is an educational simulation project, not financial advice.</p><Link href="/">Back to RippleLab</Link></footer>
    </main>
  );
}
