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
  { day: 10, title: "Oil-price engine", detail: "Direct fuel costs and indirect transport, food and utility pass-through.", state: "next" },
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
          <h1>Your household can now experience inflation differently from the headline.</h1>
          <p>RippleLab is 9 days into a structured 30-day build. The new inflation engine reprices an editable five-category personal basket, compares it with the current path and exposes salary and portfolio purchasing-power diagnostics.</p>
        </div>
        <div className="progress-score" aria-label="Nine of thirty days complete">
          <strong>9</strong><span>of 30 days</span><div><i style={{ width: "30%" }} /></div><small>Personal inflation engine</small>
        </div>
      </section>

      <section aria-labelledby="delivered-heading" className="progress-delivered">
        <header><p className="eyebrow">Delivered so far</p><h2 id="delivered-heading">A working product spine, not a visual mockup.</h2></header>
        <div className="progress-principles">
          <article><strong>Personal basket</strong><span>Five editable categories translate national CPI into household-specific price pressure.</span></article>
          <article><strong>Three perspectives</strong><span>Expenses, real salary growth and portfolio purchasing power remain distinct.</span></article>
          <article><strong>Inspectable model</strong><span>Category pass-through, source, formula, lag and confidence stay visible.</span></article>
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
          <p className="eyebrow">Day 9 inflation model</p>
          <h2 id="formula-ledger-heading">One headline rate. Five personal price channels.</h2>
          <p>The result is driven by the household&apos;s entered monthly amounts and explicit category transmission choices.</p>
        </header>
        <div>
          <article><span>Basket categories</span><strong>5</strong><p>Food, housing, transport, utilities and other household spending.</p></article>
          <article><span>Causal nodes</span><strong>10</strong><p>Headline CPI flows into category rates, the personal basket and outcomes.</p></article>
          <article><span>Causal links</span><strong>13</strong><p>Every arrow retains assumptions, evidence IDs, lag and confidence.</p></article>
          <article><span>Sensitivity shift</span><strong>±20pp</strong><p>All category pass-through rates move together to expose model sensitivity.</p></article>
        </div>
      </section>

      <section className="progress-contract">
        <div><p className="eyebrow">Day 9 boundary</p><h2>National inflation is context; the personal basket is the model.</h2><p>MoSPI methodology supports expenditure weighting, while editable pass-through values make category behavior explicit. The engine returns all money, rates, impacts and graph relationships.</p></div>
        <div aria-label="Inspectable inflation causal graph" className="progress-causal">
          <span>Headline CPI path</span><b>market context</b><i>→</i><span>Five category rates</span><b>explicit transmission</b><i>→</i><span>Expenses + purchasing power</span><b>personal outcomes</b>
        </div>
      </section>

      <footer className="progress-footer"><p>RippleLab is an educational simulation project, not financial advice.</p><Link href="/">Back to RippleLab</Link></footer>
    </main>
  );
}
