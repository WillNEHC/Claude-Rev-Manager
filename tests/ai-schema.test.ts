import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { validateExtraction } from "../src/ai/schema";
import { parseJsonLoose } from "../src/ai/extract";

function golden(name: string): { review: string; expected: unknown } {
  return JSON.parse(readFileSync(`tests/fixtures/extraction/${name}.json`, "utf8"));
}

describe("extraction schema validation", () => {
  it("accepts the golden fixtures (structural + key fields)", () => {
    for (const name of ["family-firepit", "remote-ops"]) {
      const { expected } = golden(name);
      const res = validateExtraction(expected);
      expect(res.ok, `${name}: ${res.ok ? "" : res.error}`).toBe(true);
    }
  });

  it("asserts key extracted fields on the family-firepit golden", () => {
    const res = validateExtraction(golden("family-firepit").expected);
    if (!res.ok) throw new Error(res.error);
    const d = res.data;
    expect(d.sentiment).toBe("positive");
    expect(d.amenity_mentions.map((a) => a.amenity_slug)).toContain("fire_pit");
    const firePit = d.amenity_mentions.find((a) => a.amenity_slug === "fire_pit")!;
    expect(firePit.is_negative).toBe(true); // absence complaint
    expect(d.personas[0]!.persona_slug).toBe("families");
  });

  it("asserts ops + emergent persona + place on the remote-ops golden", () => {
    const res = validateExtraction(golden("remote-ops").expected);
    if (!res.ok) throw new Error(res.error);
    const d = res.data;
    expect(d.has_operational_issue).toBe(true);
    expect(d.operational_issues.map((o) => o.issue_type)).toContain("wifi_dropping");
    expect(d.personas.find((p) => p.is_emergent)?.persona_slug).toBe("photographers");
    expect(d.place_mentions[0]!.raw_name).toBe("Canoe Club");
  });

  it("rejects a missing required field", () => {
    const { expected } = golden("family-firepit");
    const broken = { ...(expected as Record<string, unknown>) };
    delete broken.extraction_confidence;
    expect(validateExtraction(broken).ok).toBe(false);
  });

  it("rejects an out-of-range confidence and a bad enum", () => {
    const base = golden("family-firepit").expected as Record<string, unknown>;
    expect(validateExtraction({ ...base, extraction_confidence: 1.5 }).ok).toBe(false);
    expect(validateExtraction({ ...base, sentiment: "amazing" }).ok).toBe(false);
  });

  it("rejects a severity outside 1..5", () => {
    const base = golden("remote-ops").expected as Record<string, unknown>;
    const bad = {
      ...base,
      operational_issues: [
        { issue_type: "x", category_slug: null, severity: 9, excerpt: "x", confidence: 0.5 },
      ],
    };
    expect(validateExtraction(bad).ok).toBe(false);
  });
});

describe("parseJsonLoose", () => {
  it("parses clean JSON", () => {
    expect(parseJsonLoose('{"a":1}')).toEqual({ a: 1 });
  });
  it("recovers JSON wrapped in prose/code fences", () => {
    expect(parseJsonLoose('Here is the result:\n```json\n{"a":2}\n```')).toEqual({ a: 2 });
  });
  it("throws on genuinely unparseable output", () => {
    expect(() => parseJsonLoose("no json here")).toThrow();
  });
});
