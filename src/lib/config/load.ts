import { readFileSync } from "node:fs";
import { parse as parseYaml } from "yaml";
import {
  marketsFileSchema,
  discoveryFiltersFileSchema,
  type MarketsFile,
  type DiscoveryFiltersFile,
  type DiscoveryProfile,
} from "./schema";

/**
 * Config loaders. Read YAML, validate against the Zod schemas, and return typed
 * config. A validation failure throws with the path so it's obvious which file
 * and field are wrong. Callers should let this fail fast at startup.
 */

export function loadMarkets(path: string): MarketsFile {
  const raw = parseYaml(readFileSync(path, "utf8"));
  const result = marketsFileSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid markets config at ${path}:\n${formatIssues(result.error.issues)}`,
    );
  }
  return result.data;
}

export function loadDiscoveryFilters(path: string): DiscoveryFiltersFile {
  const raw = parseYaml(readFileSync(path, "utf8"));
  const result = discoveryFiltersFileSchema.safeParse(raw);
  if (!result.success) {
    throw new Error(
      `Invalid discovery filters config at ${path}:\n${formatIssues(result.error.issues)}`,
    );
  }
  return result.data;
}

/** Resolve a named discovery profile, defaulting to `default`. */
export function resolveProfile(
  filters: DiscoveryFiltersFile,
  ref = "default",
): DiscoveryProfile {
  const profile = filters.profiles[ref] ?? filters.profiles["default"];
  if (!profile) {
    throw new Error(`Discovery profile '${ref}' not found and no default exists`);
  }
  return profile;
}

function formatIssues(
  issues: { path: (string | number)[]; message: string }[],
): string {
  return issues
    .map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
}
