import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * Public marketing pages are crawlable; the authenticated app and API are not —
 * a user's private journal must never be indexed.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/home", "/journal", "/analytics", "/portfolio", "/import", "/auth/", "/api/"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
