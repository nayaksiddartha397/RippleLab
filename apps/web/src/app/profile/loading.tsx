export default function ProfileLoading() {
  return (
    <div className="route-loading" role="status">
      <span className="sr-only">Loading financial profile</span>
      <div className="route-loading__sidebar" />
      <div className="route-loading__main">
        <div className="skeleton skeleton--heading" />
        <div className="skeleton skeleton--card" />
      </div>
    </div>
  );
}
