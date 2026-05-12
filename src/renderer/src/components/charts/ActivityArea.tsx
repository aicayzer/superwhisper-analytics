import { formatCompact } from '@renderer/lib/format'
import { memo, useMemo } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { ChartTooltip } from './ChartTooltip'

const DAY_MS = 24 * 3600 * 1000
/** Window-day threshold past which the X-axis switches from "5 Mar"
 *  day-and-month labels to month-only labels anchored at month starts.
 *  At 90 days of daily data the previous behaviour produced a row of
 *  arbitrary-looking dates like "5 Mar / 19 Mar / 4 Apr / 18 Apr…"; one
 *  tick per calendar month reads cleaner. */
const MONTH_TICK_THRESHOLD_DAYS = 60

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

/** YYYY-MM-01 string for the first day of each calendar month inside
 *  (from, to]. Skips the partial month at the leading edge so the chart
 *  doesn't show a tick on day 1 of a window that starts on day 14. */
function monthBoundaries(from: Date, to: Date): string[] {
  const out: string[] = []
  const cursor = new Date(from.getFullYear(), from.getMonth() + 1, 1)
  while (cursor.getTime() <= to.getTime()) {
    out.push(`${cursor.getFullYear()}-${pad(cursor.getMonth() + 1)}-01`)
    cursor.setMonth(cursor.getMonth() + 1)
  }
  return out
}

function monthLabel(raw: unknown): string {
  const d = new Date(String(raw))
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { month: 'short' })
}

interface ActivityAreaProps<T extends object> {
  data: readonly T[]
  xKey: string
  yKey: string
  /** Tick label formatter for the X axis (date strings). */
  formatTick?: (raw: string) => string
  /** Approximate number of ticks; Recharts decides the actual stride. */
  tickCount?: number
  /** Optional date window — filters `data` to entries where `data[xKey]`
   *  parses to a Date inside [from, to]. If both are omitted the chart
   *  renders the full series unchanged. */
  from?: Date
  to?: Date
}

/**
 * Smooth area chart for daily activity. Fills its container — wrap it in a
 * sized parent (e.g. flex-1 or a fixed-height div). Single series, monotone
 * curve, gradient fill from the foreground colour.
 *
 * Y-axis widened to 44px and ticks compacted ("13.8k") so vocab growth +
 * activity counts render properly. Previously a 32px gutter clipped
 * every tick to "0".
 */
function ActivityAreaInner<T extends object>({
  data,
  xKey,
  yKey,
  formatTick,
  tickCount = 6,
  from,
  to
}: ActivityAreaProps<T>): React.JSX.Element {
  // Filter once per data/window change. Compares ms — Date.parse on the
  // YYYY-MM-DD strings the data layer produces.
  const filtered = useMemo(() => {
    if (!from && !to) return data
    const fromMs = from?.getTime() ?? -Infinity
    const toMs = to?.getTime() ?? Infinity
    return data.filter((row) => {
      const raw = (row as Record<string, unknown>)[xKey]
      if (typeof raw !== 'string') return true
      const t = Date.parse(raw)
      if (Number.isNaN(t)) return true
      return t >= fromMs && t <= toMs
    })
  }, [data, xKey, from, to])

  // Switch to month-anchored ticks when the window is long enough that
  // daily labels would crowd. Only kicks in when the chart has a real
  // `from`/`to` (Overview's "Recordings over time"); the Language screen
  // calls ActivityArea with period strings ("2026-W12") so we leave its
  // formatter alone.
  const monthTicks = useMemo<string[] | undefined>(() => {
    if (!from || !to) return undefined
    const spanDays = (to.getTime() - from.getTime()) / DAY_MS
    if (spanDays <= MONTH_TICK_THRESHOLD_DAYS) return undefined
    return monthBoundaries(from, to)
  }, [from, to])

  const effectiveTickFormatter = monthTicks ? monthLabel : formatTick

  return (
    <ResponsiveContainer width="100%" height="100%" initialDimension={{ width: 1, height: 1 }}>
      <AreaChart
        data={filtered as ReadonlyArray<Record<string, unknown>>}
        margin={{ top: 8, right: 8, left: -4, bottom: 0 }}
      >
        <defs>
          <linearGradient id="grad-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={monthTicks ? 0 : 'preserveStartEnd'}
          ticks={monthTicks}
          tickCount={tickCount}
          tickFormatter={effectiveTickFormatter}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
          tickFormatter={(v) => formatCompact(Number(v))}
        />
        <Tooltip cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} content={<ChartTooltip />} />
        <Area
          type="monotone"
          dataKey={yKey}
          stroke="var(--chart-1)"
          strokeWidth={1.6}
          fill="url(#grad-area)"
          isAnimationActive={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export const ActivityArea = memo(ActivityAreaInner) as typeof ActivityAreaInner
