"use client";

import Link from "next/link";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="site-error" role="alert">
      <span className="eyebrow">Something went wrong</span>
      <h1>We could not load this page.</h1>
      <p>Please try again. If the problem continues, call the shop at (908) 481-8884.</p>
      <div className="site-error-actions">
        <button className="primary-button" type="button" onClick={reset}>Try again</button>
        <Link className="soft-button" href="/">Return home</Link>
      </div>
    </main>
  );
}
