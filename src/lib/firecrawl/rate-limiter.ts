/**
 * Token-bucket rate limiter + concurrency gate for outbound Firecrawl calls.
 * `now` and `sleep` are injectable so tests can drive time deterministically.
 */

export interface RateLimiterOptions {
  maxRps: number;
  maxConcurrency: number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export class RateLimiter {
  private tokens: number;
  private lastRefill: number;
  private active = 0;
  private readonly capacity: number;
  private readonly refillPerMs: number;
  private readonly now: () => number;
  private readonly sleep: (ms: number) => Promise<void>;
  private readonly maxConcurrency: number;

  constructor(opts: RateLimiterOptions) {
    this.capacity = Math.max(1, opts.maxRps);
    this.tokens = this.capacity;
    this.refillPerMs = opts.maxRps / 1000;
    this.maxConcurrency = Math.max(1, opts.maxConcurrency);
    this.now = opts.now ?? Date.now;
    this.sleep = opts.sleep ?? defaultSleep;
    this.lastRefill = this.now();
  }

  private refill(): void {
    const t = this.now();
    const elapsed = t - this.lastRefill;
    if (elapsed > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + elapsed * this.refillPerMs);
      this.lastRefill = t;
    }
  }

  /** Acquire one token + a concurrency slot, waiting as needed. */
  async acquire(): Promise<void> {
    // Wait for a token.
    for (;;) {
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        break;
      }
      const needed = (1 - this.tokens) / this.refillPerMs;
      await this.sleep(Math.max(1, Math.ceil(needed)));
    }
    // Wait for a concurrency slot.
    while (this.active >= this.maxConcurrency) {
      await this.sleep(1);
    }
    this.active += 1;
  }

  release(): void {
    if (this.active > 0) this.active -= 1;
  }

  /** Run `fn` under the limiter, always releasing the slot afterward. */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }
}
