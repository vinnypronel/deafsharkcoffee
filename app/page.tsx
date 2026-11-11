import { Storefront } from "./storefront";
import { siteUrl } from "./site-url";

export default function Home() {
  return (
    <>
      <link rel="preload" as="image" href="/hero-scrub-poster.jpg" fetchPriority="high" />
      <link rel="preload" as="image" href="/drink-strawberry-matcha.webp" fetchPriority="high" />
      <Storefront canonicalUrl={siteUrl().href} />
    </>
  );
}

