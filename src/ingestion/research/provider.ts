import type { FirecrawlClient } from "../../lib/firecrawl/client";
import type { PlatformSource } from "../types";

/**
 * ToS-clean data sourcing (docs/16). Instead of scraping competitor listings,
 * we read PUBLIC web content — blogs, Reddit, forums, destination sites, Google
 * results — as market-level sentiment. A SearchProvider returns public documents
 * for a query; the gatherer turns them into market-level reviews.
 */

export interface ResearchDoc {
  url: string;
  title?: string;
  content: string;
}

export interface SearchProvider {
  search(query: string, opts?: { limit?: number }): Promise<ResearchDoc[]>;
}

/** Map a result URL to the closest platform_source enum value. */
export function classifySource(url: string): PlatformSource {
  const u = url.toLowerCase();
  if (u.includes("reddit.com")) return "reddit";
  if (u.includes("tripadvisor.") || u.includes("/forum") || u.includes("forums.")) return "forum";
  if (u.includes("google.com/maps") || u.includes("google.com/travel")) return "google";
  if (u.includes("visitnh") || u.includes(".gov") || u.includes("chamber") || u.includes("destination"))
    return "destination_site";
  if (u.includes("/blog") || u.includes("blogspot") || u.includes("medium.com") || u.includes("substack"))
    return "blog";
  return "other";
}

/** Firecrawl-backed public web search (the user's configured provider). */
export class FirecrawlResearchProvider implements SearchProvider {
  constructor(private readonly fc: FirecrawlClient) {}

  async search(query: string, opts?: { limit?: number }): Promise<ResearchDoc[]> {
    const res = await this.fc.post<{ data?: { url?: string; title?: string; markdown?: string; content?: string }[] }>(
      "/v1/search",
      {
        query,
        limit: opts?.limit ?? 10,
        scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
      },
    );
    return (res.data ?? [])
      .filter((d) => d.url)
      .map((d) => ({ url: d.url as string, title: d.title, content: d.markdown ?? d.content ?? "" }));
  }
}
