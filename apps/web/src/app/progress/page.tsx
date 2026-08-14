import Link from "next/link";

const days = [
  { day: 1, title: "MVP foundation", detail: "Monorepo, Next.js, FastAPI, shared checks and product boundaries.", state: "complete" },
  { day: 2, title: "Interface system", detail: "Responsive shell, design tokens, reusable states and accessibility baseline.", state: "complete" },
  { day: 3, title: "Private accounts", detail: "Supabase-ready authentication, recovery and protected dashboard routing.", state: "complete" },
  { day: 4, title: "Financial profile", detail: "Five-step economic digital twin with validation, persistence and row ownership.", state: "complete" },
  { day: 5, title: "Simulation contract", detail: "Versioned scenarios, evidence, assumptions, confidence and causal graph types.", state: "complete" },
  { day: 6, title: "Calculation primitives", detail: "EMI, deposits, Decimal-safe money and formula-level verification.", state: "complete" },
  { day: 7, title: "First live scenario", detail: "Profile-to-repo-rate FastAPI simulation with adjustable transmission assumptions.", state: "complete" },
  { day: 8, title: "Inspectable causal graph", detail: "Interactive graph nodes, evidence panels and keyboard-friendly exploration.", state: "next" },
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
          <h1>The first personal economic scenario now runs end to end.</h1>
          <p>RippleLab is 7 days into a structured 30-day build. A saved homeowner-and-saver profile can now travel through a repo-rate form, deterministic FastAPI calculation and transparent before-and-after impact summary.</p>
        </div>
        <div className="progress-score" aria-label="Seven of thirty days complete">
          <strong>7</strong><span>of 30 days</span><div><i style={{ width: "23.33%" }} /></div><small>First vertical slice</small>
        </div>
      </section>

      <section aria-labelledby="delivered-heading" className="progress-delivered">
        <header><p className="eyebrow">Delivered so far</p><h2 id="delivered-heading">A working product spine, not a visual mockup.</h2></header>
        <div className="progress-principles">
          <article><strong>Personal inputs</strong><span>Saved loan and deposit balances anchor every calculated output.</span></article>
          <article><strong>Editable assumptions</strong><span>Loan and deposit transmission can be changed without changing the profile.</span></article>
          <article><strong>Clear boundary</strong><span>Calculated money is separated from sensitivity ranges and timing uncertainty.</span></article>
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

      <section aria-labelledby="formula-ledger-heading" className="progress-formula-ledger">
        <header>
          <p className="eyebrow">Day 7 seeded run</p>
          <h2 id="formula-ledger-heading">One profile. Two causal paths. One net impact.</h2>
          <p>A 100 basis-point repo-rate cut is modeled for a Bengaluru homeowner with a ₹65 lakh floating loan and ₹8 lakh in fixed deposits.</p>
        </header>
        <div>
          <article><span>Loan path</span><strong>+₹31,666.08</strong><p>Annual cash-flow benefit after 70% loan pass-through.</p></article>
          <article><span>Deposit path</span><strong>-₹4,000.00</strong><p>Annual gross interest effect after 50% deposit pass-through.</p></article>
          <article><span>Net deterministic result</span><strong>+₹27,666.08</strong><p>Calculated loan benefit plus calculated deposit cost.</p></article>
          <article><span>Sensitivity bounds</span><strong>₹17,088–₹38,188</strong><p>Pass-through assumptions moved by ±20 percentage points.</p></article>
        </div>
      </section>

      <section className="progress-contract">
        <div><p className="eyebrow">Day 7 boundary</p><h2>The AI is outside the money calculation.</h2><p>The browser assembles a typed request, FastAPI validates it, and versioned Decimal formulas produce the result. The interface labels transmission, term and renewal timing as assumptions.</p></div>
        <div aria-label="Repo-rate vertical slice" className="progress-causal">
          <span>Saved financial profile</span><b>₹65L loan + ₹8L deposits</b><i>→</i><span>FastAPI scenario engine</span><b>loan + deposit formulas</b><i>→</i><span>Annual net: +₹27,666.08</span><b>medium confidence</b>
        </div>
      </section>

      <footer className="progress-footer"><p>RippleLab is an educational simulation project, not financial advice.</p><Link href="/">Back to RippleLab</Link></footer>
    </main>
  );
}
