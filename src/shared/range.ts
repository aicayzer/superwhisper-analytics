import type { Recording } from './types'

/**
 * Pure helpers around date ranges. Used by the renderer's
 * `useFilteredAggregates` hook to slice the `Recording[]` payload before
 * feeding `computeAll` for a range-aware view of every aggregate.
 *
 * Lives in `@shared/` so the renderer can import it alongside the
 * aggregate pipeline without dragging in any renderer-only concerns.
 */

export interface DateWindow {
  from?: Date
  to?: Date
}

/**
 * Filter recordings to those whose `datetime` falls inside [from, to].
 * Inclusive both ends. Empty/invalid datetime strings are filtered out so
 * downstream `new Date()` calls don't NaN.
 *
 * `from`/`to` may be omitted — an open-ended bound means "no limit on
 * that side". A window with neither bound returns the input untouched.
 */
export function filterByRange(recordings: Recording[], window: DateWindow): Recording[] {
  if (!window.from && !window.to) return recordings
  const fromMs = window.from?.getTime() ?? -Infinity
  const toMs = window.to?.getTime() ?? Infinity
  return recordings.filter((r) => {
    const t = new Date(r.datetime).getTime()
    if (Number.isNaN(t)) return false
    return t >= fromMs && t <= toMs
  })
}
