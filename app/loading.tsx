export default function Loading() {
  return (
    <main className="system-loading-page" aria-label="Loading page" aria-busy="true">
      <span className="skeleton-line short" />
      <span className="skeleton-line title" />
      <span className="skeleton-line medium" />
      <div className="system-loading-grid"><span /><span /><span /></div>
    </main>
  );
}
