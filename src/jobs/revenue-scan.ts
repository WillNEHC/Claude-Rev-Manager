/**
 * CLI: scan saved PriceLabs price calendars and print a markdown report.
 *
 *   npx tsx src/jobs/revenue-scan.ts <prices.json> <min> <base> <max> [name]
 *
 * <prices.json> is the raw response of PriceLabs `get_listing_prices`
 * ({ data: [{ id, data: PriceDay[] }] }). min/base/max come from
 * `get_listing_data` for the same listing.
 */
import { readFileSync } from "node:fs";
import { renderScan, scanCalendar, type PriceDay } from "../revenue/calendar-scan";

const [file, min, base, max, name] = process.argv.slice(2);
if (!file || !min || !base || !max) {
  console.error("usage: revenue-scan <prices.json> <min> <base> <max> [name]");
  process.exit(1);
}
const raw = JSON.parse(readFileSync(file, "utf8"));
const entry = raw?.data?.[0];
if (!entry?.data) {
  console.error("unexpected payload: expected { data: [{ id, data: [...] }] }");
  process.exit(1);
}
const scan = scanCalendar(
  { listingId: String(entry.id), name: name ?? String(entry.id), min: +min, base: +base, max: +max },
  entry.data as PriceDay[],
);
console.log(renderScan(scan));
