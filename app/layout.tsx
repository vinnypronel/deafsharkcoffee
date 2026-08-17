import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { headers } from "next/headers";
import "./globals.css";

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
      icon: [
        { url: "/favicon.ico", sizes: "64x64" },
        { url: "/favicon-tab.png", type: "image/png", sizes: "512x512" },
      ],
      shortcut: "/favicon.ico",
      apple: { url: "/favicon-tab.png", type: "image/png", sizes: "512x512" },
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
    <html lang="en">
      <body className={geist.variable}>{children}</body>
    </html>
  );
}
