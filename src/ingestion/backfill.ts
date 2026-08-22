/**
 * Backfill tooling. Ingestion/extraction/embedding are all incremental and
 * idempotent, so a historical backfill is: ingest, then *drain* the extraction
 * and embedding queues in bounded batches. `drainQueue` caps total work by
 * item count and batch count so a backfill can't run away on cost (docs/12).
 */

export interface DrainOptions {
  batchSize?: number;
  maxItems?: number; // hard ceiling on items processed (budget guard)
  maxBatches?: number; // hard ceiling on iterations
}

export interface DrainResult {
  total: number;
  batches: number;
  hitCeiling: boolean;
}

/**
 * Repeatedly run `runBatch(limit)` until it reports an empty batch, or a ceiling
 * is hit. `runBatch` returns how many items it actually processed this batch.
 */
export async function drainQueue(
  runBatch: (limit: number) => Promise<{ done: number }>,
  options: DrainOptions = {},
): Promise<DrainResult> {
  const batchSize = options.batchSize ?? 200;
  const maxItems = options.maxItems ?? Infinity;
  const maxBatches = options.maxBatches ?? Infinity;

  let total = 0;
  let batches = 0;
  let hitCeiling = false;

  while (batches < maxBatches && total < maxItems) {
    const remaining = maxItems - total;
    const limit = Math.max(1, Math.min(batchSize, remaining === Infinity ? batchSize : remaining));
    const { done } = await runBatch(limit);
    batches += 1;
    total += done;
    if (done === 0) break; // queue drained
    if (done < limit) break; // last partial batch — nothing left
  }
  if (total >= maxItems || batches >= maxBatches) hitCeiling = true;

  return { total, batches, hitCeiling };
}
