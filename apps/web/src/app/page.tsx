export default function Home() {
  return (
    <main className="flex min-h-screen items-center bg-slate-950 px-6 py-16 text-slate-100">
      <div className="mx-auto w-full max-w-5xl">
        <p className="mb-5 text-sm font-semibold uppercase tracking-[0.24em] text-teal-300">
          RippleLab / Day 1 foundation
        </p>
        <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-tight sm:text-7xl">
          See how an economic change could ripple through your finances.
        </h1>
        <p className="mt-8 max-w-2xl text-lg leading-8 text-slate-300">
          RippleLab is becoming an India-focused, source-backed simulation tool for inflation,
          repo rates, oil prices, income tax and income shocks.
        </p>
        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            ["Deterministic", "Financial results will come from tested formulas."],
            ["Inspectable", "Every material result will expose assumptions and evidence."],
            ["Personal", "Scenarios will respond to a private financial profile."],
          ].map(([title, copy]) => (
            <section key={title} className="rounded-2xl border border-slate-700 bg-slate-900 p-5">
              <h2 className="font-semibold text-teal-300">{title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-300">{copy}</p>
            </section>
          ))}
        </div>
        <p className="mt-10 max-w-3xl border-l-2 border-amber-400 pl-4 text-sm leading-6 text-slate-400">
          Educational simulations only - not investment, tax, lending or legal advice. Actual
          outcomes may differ materially from modeled estimates.
        </p>
      </div>
    </main>
  );
}
