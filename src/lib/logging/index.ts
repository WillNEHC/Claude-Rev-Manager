import pino from "pino";

/**
 * Structured logger. Every ingestion/extraction job runs under a correlation id
 * (typically the crawl_run id) so logs for one run can be filtered together.
 * LOG_LEVEL controls verbosity; pretty output in dev, JSON in prod.
 */
const level = process.env.LOG_LEVEL ?? "info";
const isProd = (process.env.NODE_ENV ?? "development") === "production";
// Pretty output in dev, but never under test (the transport spawns a worker
// thread that can keep the vitest process alive), and plain JSON in prod.
const usePretty = !isProd && !process.env.VITEST;

export const logger = pino({
  level,
  ...(usePretty
    ? { transport: { target: "pino-pretty", options: { colorize: true } } }
    : {}),
});

export type Logger = pino.Logger;

/** Child logger bound to a correlation id (e.g. a crawl_run id). */
export function runLogger(runId: string, extra?: Record<string, unknown>): Logger {
  return logger.child({ runId, ...extra });
}
