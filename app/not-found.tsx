import Link from "next/link";

export default function NotFound() {
  return (
    <main className="system-state-page">
      <p className="detail-section-kicker">404 · Off the map</p>
      <h1>We couldn&apos;t find that stay.</h1>
      <p>It may have moved, or it may be a little too well hidden.</p>
      <Link className="button button-dark" href="/explore">Explore available stays</Link>
    </main>
  );
}
