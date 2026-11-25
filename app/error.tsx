"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Page rendering failed:", error);
  }, [error]);

  return (
    <main className="system-state-page" role="alert">
      <p className="detail-section-kicker">A little hiccup</p>
      <h1>This page needs another moment.</h1>
      <p>Try again, or head back to explore stays across Karnataka.</p>
      <div>
        <button className="button button-dark" type="button" onClick={reset}>Try again</button>
        <Link className="button button-light" href="/">Go home</Link>
      </div>
    </main>
  );
}
