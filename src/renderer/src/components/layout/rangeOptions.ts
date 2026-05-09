export interface PresetOption {
  id: string
  label: string
  /** Compact label shown in the pill itself. */
  short: string
}

export const RANGE_PRESETS: ReadonlyArray<PresetOption> = [
  { id: '7', label: 'Last 7 days', short: '7 days' },
  { id: '30', label: 'Last 30 days', short: '30 days' },
  { id: '90', label: 'Last 90 days', short: '90 days' },
  { id: '365', label: 'Last 12 months', short: '12 months' },
  { id: 'all', label: 'All time', short: 'All time' }
]

/** Either a preset id, or a custom range with explicit endpoints. */
export type RangeValue = { id: string; from?: Date; to?: Date }

export const DEFAULT_RANGE: RangeValue = { id: 'all' }

const SHORT_DATE_FMT: Intl.DateTimeFormatOptions = {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
}

/** Compact label for the pill button. */
export function rangeShortLabel(v: RangeValue): string {
  if (v.id !== 'custom') {
    return RANGE_PRESETS.find((p) => p.id === v.id)?.short ?? 'Range'
  }
  if (!v.from) return 'Custom range'
  const from = v.from.toLocaleDateString('en-GB', SHORT_DATE_FMT)
  if (!v.to) return from
  const to = v.to.toLocaleDateString('en-GB', SHORT_DATE_FMT)
  return `${from} – ${to}`
}
