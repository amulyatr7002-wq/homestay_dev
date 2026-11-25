export default function ExploreLoading() {
  return (
    <main className="explore-page">
      <div className="explore-header skeleton-bar" />
      <div className="explore-title-skeleton">
        <span className="skeleton-line short" />
        <span className="skeleton-line title" />
        <span className="skeleton-line medium" />
      </div>
      <div className="explore-skeleton-layout">
        <div className="skeleton-results">
          {[0, 1, 2].map((item) => <div className="skeleton-card" key={item}><span /><div><i /><i /><i /></div></div>)}
        </div>
        <div className="skeleton-map" />
      </div>
    </main>
  );
}
