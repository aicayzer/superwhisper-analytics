import { create } from 'zustand'
import { DEFAULT_RANGE, RANGE_PRESETS, type RangeValue } from '../components/layout/rangeOptions'

/**
 * Date-range selection lifted out of MainHeader so screens can react to
 * the navbar pill. The store owns the canonical value; MainHeader writes
 * to it from the RangePill, screens subscribe to read.
 *
 * `windowFor(range, now)` resolves a RangeValue into concrete `from`/`to`
 * Date objects — preset ids become trailing windows, custom ranges pass
 * through, and 'all' returns `{}` so consumers know to skip filtering.
 */
interface RangeState {
  range: RangeValue
  setRange: (next: RangeValue) => void
}

export const useRangeStore = create<RangeState>((set) => ({
  range: DEFAULT_RANGE,
  setRange: (next) => set({ range: next })
}))

export interface DateWindow {
  from?: Date
  to?: Date
}

/** Resolve a RangeValue into concrete from/to Dates. */
export function windowFor(range: RangeValue, now: Date = new Date()): DateWindow {
  if (range.id === 'all') return {}
  if (range.id === 'custom') return { from: range.from, to: range.to }
  // Preset ids are day counts as strings ("7", "30", "90", "365").
  const days = Number(range.id)
  if (!Number.isFinite(days) || days <= 0) return {}
  const to = now
  const from = new Date(now.getTime() - days * 24 * 3600 * 1000)
  return { from, to }
}

// Re-exported so callers don't need a second import line.
export { RANGE_PRESETS, type RangeValue }
