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
  { day: 9, title: "Inflation engine", detail: "Personal expense-basket repricing with explicit category assumptions.", state: "next" },
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
          <h1>Every material link in the first scenario can now be inspected.</h1>
          <p>RippleLab is 8 days into a structured 30-day build. The repo-rate result now includes an interactive causal graph whose nodes and arrows expose their mechanism, formula, assumptions, evidence, lag and confidence.</p>
        </div>
        <div className="progress-score" aria-label="Eight of thirty days complete">
          <strong>8</strong><span>of 30 days</span><div><i style={{ width: "26.67%" }} /></div><small>Causal graph framework</small>
        </div>
      </section>

      <section aria-labelledby="delivered-heading" className="progress-delivered">
        <header><p className="eyebrow">Delivered so far</p><h2 id="delivered-heading">A working product spine, not a visual mockup.</h2></header>
        <div className="progress-principles">
          <article><strong>Engine-driven graph</strong><span>Five nodes and four edges come directly from the typed simulation result.</span></article>
          <article><strong>Keyboard inspection</strong><span>Tab, Enter and Space reveal the same evidence available by pointer or touch.</span></article>
          <article><strong>Evidence panel</strong><span>Mechanism, formula, assumptions, source, lag and confidence stay together.</span></article>
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
          <p className="eyebrow">Day 8 graph framework</p>
          <h2 id="formula-ledger-heading">Select a relationship. Explain it. Verify it.</h2>
          <p>The same Day 7 result is now explorable as an economic chain rather than a collection of unexplained output cards.</p>
        </header>
        <div>
          <article><span>Material nodes</span><strong>5</strong><p>Policy, product rates, EMI and household deposit income.</p></article>
          <article><span>Directional links</span><strong>4</strong><p>Each arrow carries mechanism, lag, assumptions and evidence IDs.</p></article>
          <article><span>Node categories</span><strong>3</strong><p>Policy, financial-product and household styling preserves context.</p></article>
          <article><span>Evidence inspector</span><strong>1</strong><p>A synchronized panel for formulas, sources and confidence rationale.</p></article>
        </div>
      </section>

      <section className="progress-contract">
        <div><p className="eyebrow">Day 8 boundary</p><h2>The graph visualizes the engine; it does not recreate it.</h2><p>Node values, edges, assumption IDs, citation IDs and confidence arrive in the FastAPI result. The frontend adds layout and formula labels without recalculating the household impact.</p></div>
        <div aria-label="Inspectable repo-rate causal graph" className="progress-causal">
          <span>RBI repo-rate change</span><b>policy node</b><i>→</i><span>Loan + deposit rates</span><b>financial-product nodes</b><i>→</i><span>EMI + deposit income</span><b>household nodes</b>
        </div>
      </section>

      <footer className="progress-footer"><p>RippleLab is an educational simulation project, not financial advice.</p><Link href="/">Back to RippleLab</Link></footer>
    </main>
  );
}
