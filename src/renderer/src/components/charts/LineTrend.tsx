import { formatCompact } from '@renderer/lib/format'
import { memo } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface LineTrendProps {
  data: Array<Record<string, unknown>>
  xKey: string
  yKey: string
  /** Optional horizontal target line (e.g. WPM goal). */
  reference?: { value: number; label?: string }
  formatTick?: (raw: string) => string
  /** Custom Y-axis tick formatter — defaults to compact-number. Filler rate
   *  passes a `${v}%` formatter so percent values read naturally. */
  formatYTick?: (raw: number) => string
}

/**
 * Sparse line chart for trends over time. Single series, no dots, monotone.
 * Optional dashed reference line for a target value (e.g. 140 WPM). Fills
 * its container.
 */
function LineTrendInner({
  data,
  xKey,
  yKey,
  reference,
  formatTick,
  formatYTick
}: LineTrendProps): React.JSX.Element {
  const yTick = formatYTick ?? ((v: number) => formatCompact(v))
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 8, right: 8, left: -4, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          tickCount={6}
          tickFormatter={formatTick}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
          tickFormatter={(v) => yTick(Number(v))}
        />
        {reference && (
          <ReferenceLine
            y={reference.value}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 4"
            strokeWidth={1}
            label={
              reference.label
                ? {
                    value: reference.label,
                    fill: 'var(--muted-foreground)',
                    fontSize: 10,
                    position: 'right'
                  }
                : undefined
            }
          />
        )}
        <Tooltip cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} content={<ChartTooltip />} />
        <Line
          type="monotone"
          dataKey={yKey}
          stroke="var(--chart-1)"
          strokeWidth={1.6}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export const LineTrend = memo(LineTrendInner)
