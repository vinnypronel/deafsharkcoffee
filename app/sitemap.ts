import type { MetadataRoute } from "next";
import { siteUrl } from "./site-url";

const PUBLIC_ROUTES = [
  "/",
  "/menu",
  "/about",
  "/events",
  "/contact",
  "/employment",
  "/privacy",
  "/terms",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  return PUBLIC_ROUTES.map((route) => ({
    url: new URL(route, base).toString(),
    changeFrequency: route === "/menu" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : route === "/menu" ? 0.9 : 0.6,
  }));
}
