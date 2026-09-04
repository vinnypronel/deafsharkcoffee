import Link from "next/link";

/* Replaces the framework's bare 404. Anyone who mistypes a URL, or follows an
   old link after the DreamHost cutover, lands here with a way back. */
export default function NotFound() {
  return (
    <main className="site-error">
      <span className="eyebrow">Page not found</span>
      <h1>We could not find that page.</h1>
      <p>
        It may have moved, or the link may be out of date. The menu, hours, and
        directions are all still here. If you need the shop, call (908) 481-8884.
      </p>
      <div className="site-error-actions">
        <Link className="primary-button" href="/">Return home</Link>
        <Link className="soft-button" href="/menu">See the menu</Link>
      </div>
    </main>
  );
}
