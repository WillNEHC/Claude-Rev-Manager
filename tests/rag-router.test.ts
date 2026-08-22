import { describe, it, expect } from "vitest";
import { classifyQuestion } from "../src/rag/router";

describe("question router", () => {
  it("routes open-ended questions to semantic and lifts market+persona", () => {
    const r = classifyQuestion("What do families complain about on Squam Lake?");
    expect(r.route).toBe("semantic");
    expect(r.filters.marketSlug).toBe("squam-lake");
    expect(r.filters.personaSlug).toBe("families");
  });

  it("routes aggregation questions to structured and lifts place + market", () => {
    const r = classifyQuestion("What restaurants are mentioned most often by Lake Sunapee visitors?");
    expect(r.route).toBe("structured");
    expect(r.filters.placeType).toBe("restaurant");
    expect(r.filters.marketSlug).toBe("lake-sunapee");
  });

  it("detects trending direction", () => {
    const r = classifyQuestion("What amenities are trending upward?");
    expect(r.route).toBe("structured");
    expect(r.filters.direction).toBe("up");
  });

  it("routes mixed questions to hybrid", () => {
    const r = classifyQuestion("Why do the top amenities on Winnipesaukee get the most praise?");
    expect(r.route).toBe("hybrid");
    expect(r.filters.marketSlug).toBe("lake-winnipesaukee");
  });

  it("defaults ambiguous questions to hybrid", () => {
    expect(classifyQuestion("Tell me about the dock situation").route).toBe("hybrid");
  });
});
