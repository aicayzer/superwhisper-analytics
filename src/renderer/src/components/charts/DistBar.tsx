import { formatCompact } from '@renderer/lib/format'
import { memo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface DistBarProps<T extends object> {
  data: readonly T[]
  /** Bucket label key — shown on X axis */
  xKey: string
  /** Numeric value key */
  yKey: string
}

/**
 * Vertical bar chart over labelled buckets — duration distribution,
 * sentence-length distribution etc. Fills its container. Slightly muted
 * fill to distinguish from the primary VBar.
 *
 * Y-axis was previously 32px wide with no tickFormatter — counts in the
 * thousands overflowed and Recharts clipped them to a single visible "0".
 * `width={44}` + `formatCompact` keeps "1.2k" style ticks readable.
 *
 * Margin-left is tuned (negative) so the y-axis tick labels render close
 * to the card's left edge, visually aligned with the card title. Without
 * the offset, ticks float ~14px right of the title which reads as a
 * misalignment between heading and y-axis.
 */
function DistBarInner<T extends object>({ data, xKey, yKey }: DistBarProps<T>): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data as ReadonlyArray<Record<string, unknown>>}
        margin={{ top: 8, right: 8, left: -24, bottom: 0 }}
      >
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
          allowDecimals={false}
          tickFormatter={(v) => formatCompact(Number(v))}
        />
        <Tooltip cursor={{ fill: 'var(--accent)' }} content={<ChartTooltip />} />
        <Bar
          dataKey={yKey}
          fill="var(--chart-2)"
          radius={[3, 3, 0, 0]}
          maxBarSize={36}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export const DistBar = memo(DistBarInner) as typeof DistBarInner
