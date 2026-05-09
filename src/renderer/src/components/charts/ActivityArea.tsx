import { useMemo } from 'react'
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

interface ActivityAreaProps {
  data: Array<Record<string, unknown>>
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
 */
export function ActivityArea({
  data,
  xKey,
  yKey,
  formatTick,
  tickCount = 6,
  from,
  to
}: ActivityAreaProps): React.JSX.Element {
  // Filter once per data/window change. Compares ms — Date.parse on the
  // YYYY-MM-DD strings the data layer produces.
  const filtered = useMemo(() => {
    if (!from && !to) return data
    const fromMs = from?.getTime() ?? -Infinity
    const toMs = to?.getTime() ?? Infinity
    return data.filter((row) => {
      const raw = row[xKey]
      if (typeof raw !== 'string') return true
      const t = Date.parse(raw)
      if (Number.isNaN(t)) return true
      return t >= fromMs && t <= toMs
    })
  }, [data, xKey, from, to])

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={filtered} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
          interval="preserveStartEnd"
          tickCount={tickCount}
          tickFormatter={formatTick}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={32}
          allowDecimals={false}
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
