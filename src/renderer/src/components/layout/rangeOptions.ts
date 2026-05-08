export interface RangeOption {
  id: string
  label: string
  /** Compact label shown in the pill itself. */
  short: string
}

export const RANGE_OPTIONS: ReadonlyArray<RangeOption> = [
  { id: '7', label: 'Last 7 days', short: '7 days' },
  { id: '30', label: 'Last 30 days', short: '30 days' },
  { id: '90', label: 'Last 90 days', short: '90 days' },
  { id: '365', label: 'Last 12 months', short: '12 months' },
  { id: 'all', label: 'All time', short: 'All time' }
]
