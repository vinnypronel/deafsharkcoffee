import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { SmoothScrollProvider } from "./smooth-scroll-provider";
import { PageTransition } from "./page-transition";
import { MobileScrollProgress } from "./mobile-scroll-progress";
import { DesktopScrollThumb } from "./desktop-scroll-thumb";
import { siteUrl } from "./site-url";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const base = siteUrl();
  const title = "Deaf Shark Coffee | Order Pickup in Union, NJ";
  const description = "Coffee from El Salvador, breakfast, sandwiches, and Latin favorites. Order pickup from Deaf Shark Coffee in Union, New Jersey.";

  return {
    metadataBase: base,
    title,
    description,
    alternates: { canonical: base },
    icons: {
      icon: { url: "/favicon.png", type: "image/png" },
      shortcut: "/favicon.png",
      apple: { url: "/favicon.png", type: "image/png" },
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: new URL("/og.png", base).toString(), width: 1200, height: 630, alt: "Deaf Shark Coffee, coffee from El Salvador roasted in Union" }],
    },
    twitter: { card: "summary_large_image", title, description, images: [new URL("/og.png", base).toString()] },
  };
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
        <link rel="icon" href="/favicon.ico" />
        <link rel="shortcut icon" href="/favicon.png" />
        <link rel="apple-touch-icon" href="/favicon.png" />
        {/* Mobile browsers normally restore the previous scroll offset on reload.
            The home-page hero is scroll-scrubbed, so a reload must begin at frame
            zero and at the top instead of reviving a stale scene. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{" +
              "if(location.pathname!=='/')return;" +
              "if('scrollRestoration' in history)history.scrollRestoration='manual';" +
              "var nav=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];" +
              "if(!nav||nav.type==='reload'){" +
              "var reset=function(){document.documentElement.scrollTop=0;if(document.body)document.body.scrollTop=0;window.scrollTo(0,0);};" +
              "reset();window.addEventListener('pageshow',reset,{once:true});" +
              "}" +
              "}catch(e){}})();",
          }}
        />
        <link rel="preload" as="image" href="/hero-scrub-poster.jpg" fetchPriority="high" />
        <link rel="preload" as="image" href="/drink-strawberry-matcha.webp" fetchPriority="high" />
        {/* Start the hero scrub download while the document is still parsing, so the
            footage is buffered before React hydrates and the first scroll happens.
            ScrollHero picks these same elements up instead of creating its own. */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "(function(){try{" +
              "var mobile=window.matchMedia('(max-width: 767px)').matches;" +
              "var src=mobile?'/hero-scrub-mobile.mp4':'/hero-scrub.mp4';" +
              "var v=document.createElement('video');" +
              "v.muted=true;v.playsInline=true;v.autoplay=false;v.loop=false;v.preload='auto';v.src=src;v.load();v.pause();" +
              "window.__heroScrubVideo=v;window.__heroScrubSrc=src;" +
              "var p=new Image();p.src='/hero-scrub-poster.jpg';window.__heroScrubPoster=p;" +
              "}catch(e){}})();",
          }}
        />
      </head>
      <body className={geist.variable} suppressHydrationWarning>
        <PageTransition />
        <MobileScrollProgress />
        <DesktopScrollThumb />
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
