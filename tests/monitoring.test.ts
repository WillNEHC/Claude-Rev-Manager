import { describe, it, expect } from "vitest";
import { evaluateHealth, type CrawlRunSummary } from "../src/monitoring/health";
import { WebhookAlertSink } from "../src/monitoring/sink";

const okRun: CrawlRunSummary = { source: "airbnb", status: "succeeded", reviewsFound: 20, reviewsNew: 5, pagesFetched: 10 };

describe("health evaluation", () => {
  it("returns no alerts for a healthy run", () => {
    expect(evaluateHealth({ crawlRuns: [okRun] })).toHaveLength(0);
  });

  it("raises critical on a failed crawl and warn on a partial", () => {
    const alerts = evaluateHealth({
      crawlRuns: [
        { ...okRun, status: "failed" },
        { ...okRun, source: "vrbo", status: "partial" },
      ],
    });
    expect(alerts.find((a) => a.code === "crawl_failed")?.severity).toBe("critical");
    expect(alerts.find((a) => a.code === "crawl_partial")?.severity).toBe("warn");
  });

  it("warns when pages were fetched but no reviews found (possible block)", () => {
    const alerts = evaluateHealth({ crawlRuns: [{ ...okRun, reviewsFound: 0, pagesFetched: 10 }] });
    expect(alerts.some((a) => a.code === "no_reviews_found")).toBe(true);
  });

  it("escalates extraction failure rate from warn to critical", () => {
    expect(evaluateHealth({ crawlRuns: [], extractionProcessed: 85, extractionFailed: 15 }).find((a) => a.code === "extraction_failure_rate")?.severity).toBe("warn");
    expect(evaluateHealth({ crawlRuns: [], extractionProcessed: 60, extractionFailed: 40 }).find((a) => a.code === "extraction_failure_rate")?.severity).toBe("critical");
  });

  it("warns on Firecrawl budget overrun", () => {
    const alerts = evaluateHealth({ crawlRuns: [], firecrawlPagesFetched: 1200, firecrawlBudgetPages: 1000 });
    expect(alerts.some((a) => a.code === "firecrawl_budget")).toBe(true);
  });
});

describe("webhook alert sink", () => {
  it("posts a summary when there are alerts", async () => {
    let body = "";
    const fakeFetch = (async (_url: string, init?: RequestInit) => {
      body = String(init?.body);
      return new Response("ok", { status: 200 });
    }) as unknown as typeof fetch;
    const sink = new WebhookAlertSink("https://hooks.example/x", fakeFetch);
    await sink.emit([{ severity: "critical", code: "crawl_failed", message: "airbnb failed" }]);
    expect(body).toContain("CRITICAL");
    expect(body).toContain("airbnb failed");
  });

  it("does not post when there are no alerts", async () => {
    let called = false;
    const fakeFetch = (async () => {
      called = true;
      return new Response("ok");
    }) as unknown as typeof fetch;
    await new WebhookAlertSink("https://hooks.example/x", fakeFetch).emit([]);
    expect(called).toBe(false);
  });
});
