import type { MetadataRoute } from "next";
import { PRIVATE_PATHS, SITE_INDEX, SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: SITE_INDEX ? { userAgent: "*", allow: "/", disallow: PRIVATE_PATHS } : { userAgent: "*", disallow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
