import Link from "next/link";

const days = [
  { day: 1, title: "MVP foundation", detail: "Monorepo, Next.js, FastAPI, shared checks and product boundaries.", state: "complete" },
  { day: 2, title: "Interface system", detail: "Responsive shell, design tokens, reusable states and accessibility baseline.", state: "complete" },
  { day: 3, title: "Private accounts", detail: "Supabase-ready authentication, recovery and protected dashboard routing.", state: "complete" },
  { day: 4, title: "Financial profile", detail: "Five-step economic digital twin with validation, persistence and row ownership.", state: "complete" },
  { day: 5, title: "Simulation contract", detail: "Versioned scenarios, evidence, assumptions, confidence and causal graph types.", state: "complete" },
  { day: 6, title: "Calculation primitives", detail: "EMI, deposits, Decimal-safe money and formula-level verification.", state: "complete" },
  { day: 7, title: "First live scenario", detail: "Profile-to-repo-rate end-to-end simulation and impact summary.", state: "next" },
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
          <h1>Six foundations built. The calculation engine is online.</h1>
          <p>RippleLab is 6 days into a structured 30-day build. Loan and deposit calculations now run with explicit formulas, Decimal-safe money, versioned outputs and boundary tests.</p>
        </div>
        <div className="progress-score" aria-label="Six of thirty days complete">
          <strong>6</strong><span>of 30 days</span><div><i style={{ width: "20%" }} /></div><small>Deterministic engine</small>
        </div>
      </section>

      <section aria-labelledby="delivered-heading" className="progress-delivered">
        <header><p className="eyebrow">Delivered so far</p><h2 id="delivered-heading">A working product spine, not a visual mockup.</h2></header>
        <div className="progress-principles">
          <article><strong>Five primitives</strong><span>EMI, balance, transmission, rate reset and deposit interest.</span></article>
          <article><strong>Exact arithmetic</strong><span>Integer paise, basis points and 50-digit Decimal intermediates.</span></article>
          <article><strong>Auditable outputs</strong><span>Formula version, assumptions and rounding policy travel with every result.</span></article>
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
          <p className="eyebrow">Day 6 formula ledger</p>
          <h2 id="formula-ledger-heading">Known inputs. Reproducible outputs.</h2>
          <p>These are deterministic fixtures, not forecasts. Each value is calculated in paise with one documented final rounding step.</p>
        </header>
        <div>
          <article><span>loan.emi.v1</span><strong>₹43,391.16</strong><p>Monthly EMI: ₹50 lakh, 8.50%, 240 months.</p></article>
          <article><span>loan.outstanding_balance.v1</span><strong>₹44,06,359.16</strong><p>Principal remaining after 60 scheduled payments.</p></article>
          <article><span>loan.floating_rate_reset.v1</span><strong>-₹2,189.36</strong><p>Monthly change after 70% of a 100 bps cut.</p></article>
          <article><span>deposit.simple_interest.v1</span><strong>₹72,500.00</strong><p>Gross annual interest: ₹10 lakh at 7.25%.</p></article>
        </div>
      </section>

      <section className="progress-contract">
        <div><p className="eyebrow">Day 6 engine</p><h2>Every number carries its method.</h2><p>The engine keeps unrounded Decimal intermediates, rounds public money once to the nearest paise and returns the formula version plus its assumptions.</p></div>
        <div aria-label="Illustrative rate reset calculation" className="progress-causal">
          <span>Reference shock: -100 bps</span><b>70% pass-through</b><i>→</i><span>Loan reset: -70 bps</span><b>8.50% to 7.80%</b><i>→</i><span>EMI: -₹2,189.36</span><b>version + assumptions</b>
        </div>
      </section>

      <footer className="progress-footer"><p>RippleLab is an educational simulation project, not financial advice.</p><Link href="/">Back to RippleLab</Link></footer>
    </main>
  );
}
