/**
 * CLI: scan our own guest reviews (Hospitable review objects) and print a markdown report.
 *
 *   npx tsx src/jobs/review-scan.ts <reviews.json>
 *
 * <reviews.json> may be a bare array of reviews or a Hospitable API page ({ data: [...] }).
 */
import { readFileSync } from "node:fs";
import { renderReviewScan, scanReviews, type HospitableReview } from "../guest/review-scan";

const file = process.argv[2];
if (!file) {
  console.error("usage: review-scan <reviews.json>");
  process.exit(1);
}
const raw = JSON.parse(readFileSync(file, "utf8"));
const list: HospitableReview[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : [];
if (!list.length) {
  console.error("no reviews found in file (expected an array or { data: [...] })");
  process.exit(1);
}
console.log(renderReviewScan(scanReviews(list)));
