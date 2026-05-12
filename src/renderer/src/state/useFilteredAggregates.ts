import { computeAll, type BucketBy } from '@shared/aggregates'
import { filterByRange } from '@shared/range'
import type { Aggregates, Recording } from '@shared/types'
import { useMemo } from 'react'
import { useDataStore } from './dataStore'
import { useRangeStore, windowFor } from './rangeStore'

const DAY_MS = 24 * 3600 * 1000

/**
 * Pick a trend-bucket granularity from a window-in-days. Daily reads well
 * up to ~30 buckets; weekly up to ~13 (a quarter); beyond that monthly.
 *
 * Exported for direct unit-testing — see `useFilteredAggregates.test.ts`.
 * The hook itself is React glue; the bucketing thresholds are the
 * logic worth pinning down.
 */
export function pickBucketBy(days: number): BucketBy {
  if (days <= 29) return 'day'
  if (days <= 90) return 'week'
  return 'month'
}

/**
 * Total span (days) covered by the recording dataset, used when
 * range="all". Exported for direct unit-testing.
 */
export function datasetSpanDays(recordings: ReadonlyArray<Recording>): number {
  if (recordings.length === 0) return 0
  let min = Infinity
  let max = -Infinity
  for (const r of recordings) {
    const t = new Date(r.datetime).getTime()
    if (isNaN(t)) continue
    if (t < min) min = t
    if (t > max) max = t
  }
  if (!isFinite(min) || !isFinite(max)) return 0
  return Math.max(1, Math.round((max - min) / DAY_MS))
}

/**
 * Range-aware aggregates. Screens that should respect the navbar's date
 * pill (Overview, Usage, Language, every chart on those pages) call this
 * hook instead of reading aggregate fields off `dataStore` directly.
 *
 * Two paths:
 *   • Range = "all" (or unset) → returns `dataStore.aggregates` unchanged.
 *     Main process already pre-computed this bundle, no work.
 *   • Otherwise → filters `dataStore.recordings` to the window and
 *     re-runs `computeAll` on the slice. Cost is ~150ms on 11k recordings;
 *     `useMemo` keys on the recording array + the range value + the now-
 *     bucket (truncated to the day) so flipping back to a previously-seen
 *     range hits the cache.
 *
 * TranscriptsList intentionally does NOT use this — the flat list shows
 * every recording, irrespective of the date pill.
 */
export function useFilteredAggregates(): Aggregates {
  const recordings = useDataStore((s) => s.recordings)
  const fullAggregates = useDataStore((s) => s.aggregates)
  const range = useRangeStore((s) => s.range)

  return useMemo(() => {
    const window = windowFor(range)
    // "All time" (no window) — bucket the trends by the dataset's natural
    // span and use the legacy 365-day streak window so the full-year grid
    // stays available.
    if (!window.from && !window.to) {
      const spanDays = datasetSpanDays(recordings)
      const bucketBy = pickBucketBy(spanDays)
      // If the prebuilt fullAggregates was computed with the default (week)
      // bucketing we need to recompute trends here for monthly when the
      // dataset is multi-year. We keep streakCells from the prebuilt to
      // avoid recomputing the calendar.
      if (bucketBy === 'month') {
        const reb = computeAll(recordings, new Date(), {
          bucketBy,
          streakWindowDays: 365
        })
        return {
          ...reb,
          sparklines: fullAggregates.sparklines,
          streakCells: fullAggregates.streakCells
        }
      }
      return fullAggregates
    }
    const windowDays = Math.max(
      1,
      Math.round(((window.to ?? new Date()).getTime() - (window.from?.getTime() ?? 0)) / DAY_MS)
    )
    const bucketBy = pickBucketBy(windowDays)
    const slice = filterByRange(recordings, window)
    const filtered = computeAll(slice, new Date(), { bucketBy })
    // Sparklines + streak cells stay tied to the full unfiltered dataset.
    // Sparklines: shrinking to 7 points padded with zeros reads as a flat
    // line. Streak cells: the calendar always shows full calendar months
    // and shades cells inside the range darker than the ones outside — so
    // it needs the full last-365-days dataset to compute against, with
    // the active range used only for shading.
    return {
      ...filtered,
      sparklines: fullAggregates.sparklines,
      streakCells: fullAggregates.streakCells
    }
  }, [recordings, fullAggregates, range])
}
