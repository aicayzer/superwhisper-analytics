export interface PresetOption {
  id: string
  /** Long-form label used in tooltips and the long view ("Last 7 days"). */
  label: string
  /** Compact label shown inside the segmented control ("7d", "All time"). */
  pill: string
}

export const RANGE_PRESETS: ReadonlyArray<PresetOption> = [
  { id: '7', label: 'Last 7 days', pill: '7d' },
  { id: '30', label: 'Last 30 days', pill: '30d' },
  { id: '90', label: 'Last 90 days', pill: '90d' },
  { id: 'all', label: 'All time', pill: 'All time' }
]

/** Either a preset id, or a custom range with explicit endpoints. */
export type RangeValue = { id: string; from?: Date; to?: Date }

/** 90d covers a full quarter of activity without exposing the cold start
 *  of a fresh install. The user can widen via the navbar pill. */
export const DEFAULT_RANGE: RangeValue = { id: '90' }

const SHORT_DATE_FMT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
}

/** Compact label for the pill button — used when the active range is
 *  Custom to surface the picked dates in the segment. */
export function rangeShortLabel(v: RangeValue): string {
  if (v.id !== 'custom') {
    return RANGE_PRESETS.find((p) => p.id === v.id)?.pill ?? 'Range'
  }
  if (!v.from) return 'Custom'
  const from = v.from.toLocaleDateString('en-GB', SHORT_DATE_FMT)
  if (!v.to) return from
  const to = v.to.toLocaleDateString('en-GB', SHORT_DATE_FMT)
  return `${from} – ${to}`
}
