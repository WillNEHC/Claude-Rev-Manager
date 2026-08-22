/**
 * Exponential backoff with jitter for transient failures (429/5xx, network).
 * `isRetryable` decides which errors are worth retrying; `sleep` is injectable
 * so tests run instantly without real timers.
 */

export interface RetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  isRetryable?: (err: unknown) => boolean;
  sleep?: (ms: number) => Promise<void>;
  onRetry?: (err: unknown, attempt: number, delayMs: number) => void;
}

const defaultSleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 500;
  const maxDelayMs = opts.maxDelayMs ?? 16_000;
  const isRetryable = opts.isRetryable ?? (() => true);
  const sleep = opts.sleep ?? defaultSleep;

  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (attempt === maxAttempts || !isRetryable(err)) break;
      const backoff = Math.min(maxDelayMs, baseDelayMs * 2 ** (attempt - 1));
      const jitter = Math.random() * backoff * 0.25;
      const delayMs = Math.round(backoff + jitter);
      opts.onRetry?.(err, attempt, delayMs);
      await sleep(delayMs);
    }
  }
  throw lastErr;
}

/** Error carrying an HTTP status so retryability can be decided by code. */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

/** Retry 429 and 5xx; treat network errors (no status) as retryable too. */
export function isRetryableHttp(err: unknown): boolean {
  if (err instanceof HttpError) {
    return err.status === 429 || (err.status >= 500 && err.status <= 599);
  }
  return true; // network/timeout errors have no status
}
