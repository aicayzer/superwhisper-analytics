import { computeAll } from '@shared/aggregates'
import { filterByRange } from '@shared/range'
import type { Aggregates } from '@shared/types'
import { useMemo } from 'react'
import { useDataStore } from './dataStore'
import { useRangeStore, windowFor } from './rangeStore'

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
    if (!window.from && !window.to) return fullAggregates
    const slice = filterByRange(recordings, window)
    return computeAll(slice)
  }, [recordings, fullAggregates, range])
}
