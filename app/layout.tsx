import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";
import { SmoothScrollProvider } from "./smooth-scroll-provider";
import { PageTransition } from "./page-transition";
import { MobileScrollProgress } from "./mobile-scroll-progress";

const geist = Geist({
  variable: "--font-geist",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost:3000";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? (host.includes("localhost") ? "http" : "https");
  const base = new URL(`${protocol}://${host}`);
  const title = "Deaf Shark Coffee | Order Pickup in Union, NJ";
  const description = "Coffee from El Salvador, breakfast, sandwiches, and Latin favorites. Order pickup from Deaf Shark Coffee in Union, New Jersey.";

  return {
    metadataBase: base,
    title,
    description,
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
        <link rel="preload" as="image" href="/hero-scrub-poster.jpg" />
        <link rel="preload" as="video" href="/hero-scrub.mp4" type="video/mp4" media="(min-width: 768px)" />
        <link rel="preload" as="video" href="/hero-scrub-mobile.mp4" type="video/mp4" media="(max-width: 767px)" />
      </head>
      <body className={geist.variable} suppressHydrationWarning>
        <PageTransition />
        <MobileScrollProgress />
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
      </body>
    </html>
  );
}
