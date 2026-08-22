import { existsSync } from "node:fs";

/**
 * Resolve a config path: prefer the real file, fall back to the committed
 * `.example` so the project runs out of the box (the examples mirror the seed
 * data in migration 0005). Override via env for non-standard locations.
 */
export function resolveConfigPath(realPath: string, envVar?: string): string {
  const fromEnv = envVar ? process.env[envVar] : undefined;
  if (fromEnv) return fromEnv;
  if (existsSync(realPath)) return realPath;
  const example = realPath.replace(/(\.[a-z]+)$/, ".example$1");
  if (existsSync(example)) return example;
  return realPath; // let the loader throw a clear ENOENT if neither exists
}

export const MARKETS_CONFIG = () =>
  resolveConfigPath("config/markets.yaml", "GDIP_MARKETS_CONFIG");
export const DISCOVERY_CONFIG = () =>
  resolveConfigPath("config/discovery-filters.yaml", "GDIP_DISCOVERY_CONFIG");
