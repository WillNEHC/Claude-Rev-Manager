import { describe, it, expect } from "vitest";
import { drainQueue } from "../src/ingestion/backfill";

describe("drainQueue", () => {
  it("drains a finite queue in full batches then stops on the partial batch", async () => {
    let remaining = 450; // 200 + 200 + 50
    const res = await drainQueue(async (limit) => {
      const done = Math.min(limit, remaining);
      remaining -= done;
      return { done };
    }, { batchSize: 200 });
    expect(res.total).toBe(450);
    expect(res.batches).toBe(3);
    expect(res.hitCeiling).toBe(false);
    expect(remaining).toBe(0);
  });

  it("stops immediately when the queue is already empty", async () => {
    const res = await drainQueue(async () => ({ done: 0 }), { batchSize: 200 });
    expect(res.total).toBe(0);
    expect(res.batches).toBe(1);
  });

  it("respects the maxItems budget ceiling", async () => {
    let processed = 0;
    const res = await drainQueue(async (limit) => {
      processed += limit;
      return { done: limit }; // an effectively infinite queue
    }, { batchSize: 100, maxItems: 250 });
    expect(res.total).toBe(250); // 100 + 100 + 50 (last batch limited by remaining budget)
    expect(res.hitCeiling).toBe(true);
    expect(processed).toBe(250);
  });

  it("respects the maxBatches ceiling", async () => {
    const res = await drainQueue(async (limit) => ({ done: limit }), { batchSize: 100, maxBatches: 3 });
    expect(res.batches).toBe(3);
    expect(res.total).toBe(300);
    expect(res.hitCeiling).toBe(true);
  });
});
