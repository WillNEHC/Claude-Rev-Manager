import { describe, it, expect } from "vitest";
import { withRetry, HttpError, isRetryableHttp } from "../src/lib/firecrawl/retry";
import { FirecrawlClient, type Fetcher } from "../src/lib/firecrawl/client";

const noSleep = async () => {};

describe("retry", () => {
  it("retries retryable errors up to maxAttempts then throws", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new HttpError(503, "unavailable");
        },
        { maxAttempts: 4, isRetryable: isRetryableHttp, sleep: noSleep },
      ),
    ).rejects.toBeInstanceOf(HttpError);
    expect(calls).toBe(4);
  });

  it("does not retry non-retryable errors (4xx)", async () => {
    let calls = 0;
    await expect(
      withRetry(
        async () => {
          calls += 1;
          throw new HttpError(400, "bad request");
        },
        { maxAttempts: 4, isRetryable: isRetryableHttp, sleep: noSleep },
      ),
    ).rejects.toBeInstanceOf(HttpError);
    expect(calls).toBe(1);
  });

  it("succeeds after transient failures", async () => {
    let calls = 0;
    const result = await withRetry(
      async () => {
        calls += 1;
        if (calls < 3) throw new HttpError(500, "boom");
        return "ok";
      },
      { maxAttempts: 5, isRetryable: isRetryableHttp, sleep: noSleep },
    );
    expect(result).toBe("ok");
    expect(calls).toBe(3);
  });
});

describe("FirecrawlClient", () => {
  it("retries 5xx then succeeds, and caches identical requests", async () => {
    let httpCalls = 0;
    const fetcher: Fetcher = async () => {
      httpCalls += 1;
      if (httpCalls < 2) return { status: 500, body: "err" };
      return { status: 200, body: JSON.stringify({ data: { ok: true } }) };
    };
    const client = new FirecrawlClient({
      apiKey: "test",
      fetcher,
      maxRps: 1000,
      maxConcurrency: 4,
      sleep: noSleep,
    });

    const a = await client.post<{ data: { ok: boolean } }>("/v1/extract", { urls: ["x"] });
    expect(a.data.ok).toBe(true);
    expect(httpCalls).toBe(2); // one retry

    // Same payload -> served from cache, no new HTTP call.
    const b = await client.post<{ data: { ok: boolean } }>("/v1/extract", { urls: ["x"] });
    expect(b.data.ok).toBe(true);
    expect(httpCalls).toBe(2);
  });

  it("throws a typed HttpError on non-retryable 4xx", async () => {
    const fetcher: Fetcher = async () => ({ status: 400, body: "bad" });
    const client = new FirecrawlClient({ apiKey: "t", fetcher, sleep: noSleep });
    await expect(client.post("/v1/extract", { urls: ["y"] })).rejects.toBeInstanceOf(HttpError);
  });
});
