import { computeAll } from '@shared/aggregates'
import { filterByRange } from '@shared/range'
import type { Aggregates } from '@shared/types'
import { useMemo } from 'react'
import { useDataStore } from './dataStore'
import { previousWindowFor, useRangeStore, windowFor } from './rangeStore'

/**
 * Returns the current-window Aggregates alongside the equal-length prior
 * window's Aggregates, used by the Overview KPI grid to render
 * `prev → current ↑ pct` cards.
 *
 *   • Range is a preset or custom → `previous` is the equal-length window
 *     immediately before `current.from`.
 *   • Range is "All time" → `previous` is `null` (no meaningful prior),
 *     and the KPI card hides the delta row.
 *
 * Same caveats around sparklines as `useFilteredAggregates` — sparklines
 * and streak cells always stay tied to the unfiltered dataset so the
 * trailing-30-day trend doesn't collapse when the range shrinks.
 */
export interface PeriodComparison {
  current: Aggregates
  /** Null when the active range has no meaningful prior window. */
  previous: Aggregates | null
}

export function usePeriodComparison(): PeriodComparison {
  const recordings = useDataStore((s) => s.recordings)
  const fullAggregates = useDataStore((s) => s.aggregates)
  const range = useRangeStore((s) => s.range)

  return useMemo(() => {
    const window = windowFor(range)
    // No filter → "All time". Current is the full set, no comparison.
    if (!window.from && !window.to) {
      return { current: fullAggregates, previous: null }
    }
    const currentSlice = filterByRange(recordings, window)
    const current = computeAll(currentSlice)
    const prevWindow = previousWindowFor(range)
    // If there's no prior window (defensive), still surface current.
    if (!prevWindow.from || !prevWindow.to) {
      return {
        current: {
          ...current,
          sparklines: fullAggregates.sparklines,
          streakCells: fullAggregates.streakCells
        },
        previous: null
      }
    }
    const prevSlice = filterByRange(recordings, prevWindow)
    const previous = computeAll(prevSlice)
    return {
      current: {
        ...current,
        sparklines: fullAggregates.sparklines,
        streakCells: fullAggregates.streakCells
      },
      previous
    }
  }, [recordings, fullAggregates, range])
}
