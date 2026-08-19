import Link from "next/link";

const days = [
  { day: 1, title: "MVP foundation", detail: "Monorepo, Next.js, FastAPI, shared checks and product boundaries.", state: "complete" },
  { day: 2, title: "Interface system", detail: "Responsive shell, design tokens, reusable states and accessibility baseline.", state: "complete" },
  { day: 3, title: "Private accounts", detail: "Supabase-ready authentication, recovery and protected dashboard routing.", state: "complete" },
  { day: 4, title: "Financial profile", detail: "Five-step economic digital twin with validation, persistence and row ownership.", state: "complete" },
  { day: 5, title: "Simulation contract", detail: "Versioned scenarios, evidence, assumptions, confidence and causal graph types.", state: "complete" },
  { day: 6, title: "Calculation primitives", detail: "EMI, deposits, Decimal-safe money and formula-level verification.", state: "complete" },
  { day: 7, title: "First live scenario", detail: "Profile-to-repo-rate FastAPI simulation with adjustable transmission assumptions.", state: "complete" },
  { day: 8, title: "Inspectable causal graph", detail: "Interactive graph nodes, evidence panels and keyboard-friendly exploration.", state: "complete" },
  { day: 9, title: "Inflation engine", detail: "Personal expense-basket repricing with explicit category assumptions.", state: "complete" },
  { day: 10, title: "Oil-price engine", detail: "Direct fuel costs and indirect transport, food and utility pass-through.", state: "complete" },
  { day: 11, title: "Income-tax engine", detail: "AY 2026-27 slabs, Section 87A relief, cess and take-home effects.", state: "complete" },
  { day: 12, title: "Job-income engine", detail: "Runway, cash-flow deficits and goal effects after job loss or salary change.", state: "next" },
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
          <h1>See how an income-tax change can reach your take-home pay.</h1>
          <p>RippleLab is 11 days into a structured 30-day build. The new income-tax engine applies official AY 2026-27 new-regime slabs, Section 87A relief and cess before comparing current tax with an editable marginal-rate policy.</p>
        </div>
        <div className="progress-score" aria-label="Eleven of thirty days complete">
          <strong>11</strong><span>of 30 days</span><div><i style={{ width: "36.67%" }} /></div><small>Income-tax impact engine</small>
        </div>
      </section>

      <section aria-labelledby="delivered-heading" className="progress-delivered">
        <header><p className="eyebrow">Delivered so far</p><h2 id="delivered-heading">A working product spine, not a visual mockup.</h2></header>
        <div className="progress-principles">
          <article><strong>Versioned baseline</strong><span>AY 2026-27 new-regime slabs anchor the current-tax side of every comparison.</span></article>
          <article><strong>Visible relief</strong><span>Standard deduction, Section 87A rebate, marginal relief and cess remain explicit.</span></article>
          <article><strong>Personal cash flow</strong><span>Annual tax differences become a monthly take-home effect for the selected income.</span></article>
        </div>
      </section>

      <section className="progress-timeline" aria-label="RippleLab daily progress">
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
          <p className="eyebrow">Day 11 income-tax model</p>
          <h2 id="formula-ledger-heading">One policy shift. Every paid slab stays visible.</h2>
          <p>The result compares current and proposed tax on identical income, relief and cess assumptions.</p>
        </header>
        <div>
          <article><span>Paid marginal slabs</span><strong>6</strong><p>Rates from 5% through 30% shift independently of the unchanged 0% band.</p></article>
          <article><span>Causal nodes</span><strong>7</strong><p>Income and policy flow through current and proposed tax into take-home pay.</p></article>
          <article><span>Causal links</span><strong>7</strong><p>Income, policy, current tax and proposed tax converge on take-home pay.</p></article>
          <article><span>Policy sensitivity</span><strong>±1pp</strong><p>The selected rate change moves one point either side for deterministic bounds.</p></article>
        </div>
      </section>

      <section className="progress-contract">
        <div><p className="eyebrow">Day 11 boundary</p><h2>Official tax rules are the baseline; the rate shift is the scenario.</h2><p>Income Tax Department guidance supports the slabs, employee deduction, Section 87A relief and cess. Surcharge, special-rate income and filing advice remain outside this educational model.</p></div>
        <div aria-label="Inspectable income-tax causal graph" className="progress-causal">
          <span>Salary + other income</span><b>personal input</b><i>→</i><span>Current vs proposed tax</span><b>official rules + policy shift</b><i>→</i><span>Monthly take-home</span><b>personal outcome</b>
        </div>
      </section>

      <footer className="progress-footer"><p>RippleLab is an educational simulation project, not financial advice.</p><Link href="/">Back to RippleLab</Link></footer>
    </main>
  );
}
