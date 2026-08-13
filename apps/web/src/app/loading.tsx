export default function Loading() {
  return (
    <main className="route-loading" aria-live="polite" role="status">
      <div className="route-loading__sidebar" />
      <div className="route-loading__content">
        <span className="skeleton skeleton--eyebrow" />
        <span className="skeleton skeleton--heading" />
        <span className="skeleton skeleton--body" />
        <div className="route-loading__cards">
          <span className="skeleton skeleton--card" />
          <span className="skeleton skeleton--card" />
          <span className="skeleton skeleton--card" />
        </div>
      </div>
      <span className="sr-only">Loading RippleLab workspace</span>
    </main>
  );
}
