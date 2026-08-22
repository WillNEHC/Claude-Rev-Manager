import { RateLimiter } from "./rate-limiter";
import { withRetry, HttpError, isRetryableHttp } from "./retry";
import type { Logger } from "../logging";

/**
 * Firecrawl client wrapper. Composes the non-negotiable reliability features
 * (docs/04-ingestion.md): token-bucket rate limiting, bounded concurrency,
 * exponential-backoff retry on 429/5xx, an in-run response cache keyed by
 * url+params, and graceful failure (a failed page throws a typed error the
 * pipeline can degrade on, rather than aborting the whole run).
 *
 * The transport is an injectable `Fetcher` so parsing/reliability can be tested
 * with a fake and no network. The default fetcher hits the Firecrawl REST API.
 */

export interface FetchRequest {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
}
export interface FetchResponse {
  status: number;
  body: string;
}
export type Fetcher = (req: FetchRequest) => Promise<FetchResponse>;

export interface FirecrawlClientOptions {
  apiKey: string;
  baseUrl?: string;
  maxRps?: number;
  maxConcurrency?: number;
  fetcher?: Fetcher;
  logger?: Logger;
  cacheTtlMs?: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

interface CacheEntry {
  at: number;
  value: unknown;
}

const defaultFetcher: Fetcher = async (req) => {
  const res = await fetch(req.url, { method: req.method, headers: req.headers, body: req.body });
  return { status: res.status, body: await res.text() };
};

export class FirecrawlClient {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly fetcher: Fetcher;
  private readonly limiter: RateLimiter;
  private readonly cache = new Map<string, CacheEntry>();
  private readonly cacheTtlMs: number;
  private readonly logger?: Logger;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;

  constructor(opts: FirecrawlClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "https://api.firecrawl.dev").replace(/\/$/, "");
    this.fetcher = opts.fetcher ?? defaultFetcher;
    this.cacheTtlMs = opts.cacheTtlMs ?? 6 * 60 * 60 * 1000; // 6h
    this.logger = opts.logger;
    this.now = opts.now ?? Date.now;
    this.sleep = opts.sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
    this.limiter = new RateLimiter({
      maxRps: opts.maxRps ?? Number(process.env.FIRECRAWL_MAX_RPS ?? 2),
      maxConcurrency: opts.maxConcurrency ?? Number(process.env.FIRECRAWL_MAX_CONCURRENCY ?? 4),
      now: this.now,
      sleep: this.sleep,
    });
  }

  /**
   * POST a Firecrawl endpoint with reliability wrappers. Returns parsed JSON.
   * `cacheKey` (when provided) dedupes identical requests within a run.
   */
  async post<T>(path: string, payload: unknown, cacheKey?: string): Promise<T> {
    const key = cacheKey ?? `${path}:${stableStringify(payload)}`;
    const cached = this.cache.get(key);
    if (cached && this.now() - cached.at < this.cacheTtlMs) {
      return cached.value as T;
    }

    const value = await this.limiter.run(() =>
      withRetry(
        async () => {
          const res = await this.fetcher({
            url: `${this.baseUrl}${path}`,
            method: "POST",
            headers: {
              "content-type": "application/json",
              authorization: `Bearer ${this.apiKey}`,
            },
            body: JSON.stringify(payload),
          });
          if (res.status < 200 || res.status >= 300) {
            throw new HttpError(res.status, `Firecrawl ${path} -> ${res.status}: ${res.body.slice(0, 200)}`);
          }
          return JSON.parse(res.body) as T;
        },
        {
          isRetryable: isRetryableHttp,
          sleep: this.sleep,
          onRetry: (err, attempt, delayMs) =>
            this.logger?.warn({ path, attempt, delayMs, err: String(err) }, "firecrawl retry"),
        },
      ),
    );

    this.cache.set(key, { at: this.now(), value });
    return value;
  }
}

/** Deterministic JSON for stable cache keys (sorted object keys). */
export function stableStringify(value: unknown): string {
  return JSON.stringify(value, (_k, v) =>
    v && typeof v === "object" && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)))
      : v,
  );
}
