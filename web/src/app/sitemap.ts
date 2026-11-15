import type { MetadataRoute } from "next";
import { GAMES } from "@/lib/games/core";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, priority: number) => ({ url: `${SITE_URL}${path}`, changeFrequency: "weekly" as const, priority });
  return [page("/", 1), page("/rooms", 0.8), page("/book", 0.8), page("/party", 0.7), page("/games", 0.6), ...GAMES.filter((g) => !g.adult).map((g) => page(`/games/${g.id}`, 0.4))];
}
