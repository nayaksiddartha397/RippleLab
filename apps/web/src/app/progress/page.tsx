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
  { day: 11, title: "Income-tax engine", detail: "Deterministic take-home effects across editable tax-policy assumptions.", state: "next" },
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
          <h1>See how a global oil shock can reach your monthly budget.</h1>
          <p>RippleLab is 10 days into a structured 30-day build. The new oil-price engine separates crude oil in USD per barrel from retail fuel in rupees per litre, then calculates direct driving costs and three editable indirect household channels.</p>
        </div>
        <div className="progress-score" aria-label="Ten of thirty days complete">
          <strong>10</strong><span>of 30 days</span><div><i style={{ width: "33.33%" }} /></div><small>Oil-price impact engine</small>
        </div>
      </section>

      <section aria-labelledby="delivered-heading" className="progress-delivered">
        <header><p className="eyebrow">Delivered so far</p><h2 id="delivered-heading">A working product spine, not a visual mockup.</h2></header>
        <div className="progress-principles">
          <article><strong>Explicit units</strong><span>Crude USD/barrel, retail ₹/litre, monthly litres and household rupees never blur together.</span></article>
          <article><strong>Four channels</strong><span>Direct fuel, transport, food and utilities remain separate before the annual total.</span></article>
          <article><strong>Inspectable model</strong><span>Every pass-through, source, formula, lag and confidence score stays visible.</span></article>
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
          <p className="eyebrow">Day 10 oil-price model</p>
          <h2 id="formula-ledger-heading">One global shock. Four visible household channels.</h2>
          <p>The result is driven by entered fuel use, monthly expenses and explicit crude-price transmission choices.</p>
        </header>
        <div>
          <article><span>Household channels</span><strong>4</strong><p>Direct vehicle fuel plus transport, food and utility expenses.</p></article>
          <article><span>Causal nodes</span><strong>7</strong><p>Crude and retail prices flow through four channels into one annual result.</p></article>
          <article><span>Causal links</span><strong>9</strong><p>Every arrow retains assumptions, evidence IDs, lag and confidence.</p></article>
          <article><span>Sensitivity shift</span><strong>±20pp</strong><p>All pass-through rates move together to expose transmission uncertainty.</p></article>
        </div>
      </section>

      <section className="progress-contract">
        <div><p className="eyebrow">Day 10 boundary</p><h2>Crude oil is the scenario; household transmission is the model.</h2><p>PPAC supports the crude and retail-price context, while MoSPI supports the household expense categories. Editable pass-through values remain assumptions, not predictions.</p></div>
        <div aria-label="Inspectable oil-price causal graph" className="progress-causal">
          <span>Crude USD/barrel</span><b>global scenario</b><i>→</i><span>Retail + indirect channels</span><b>explicit transmission</b><i>→</i><span>Annual household effect</span><b>personal outcome</b>
        </div>
      </section>

      <footer className="progress-footer"><p>RippleLab is an educational simulation project, not financial advice.</p><Link href="/">Back to RippleLab</Link></footer>
    </main>
  );
}
