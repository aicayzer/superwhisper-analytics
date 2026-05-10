/**
 * Aggregates moved to `@shared/aggregates` so the renderer can recompute
 * range-filtered slices using the same pipeline (see `useFilteredAggregates`).
 *
 * This shim keeps the historical import path alive for any main-process or
 * test consumer that hasn't been retargeted yet.
 */
export { computeAll, emptyAggregates } from '@shared/aggregates'
