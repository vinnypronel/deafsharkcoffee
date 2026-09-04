import type { MetadataRoute } from "next";
import { siteUrl } from "./site-url";

export default function robots(): MetadataRoute.Robots {
  const base = siteUrl();
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/dashboard", "/kds/"],
      },
    ],
    sitemap: new URL("/sitemap.xml", base).toString(),
  };
}
