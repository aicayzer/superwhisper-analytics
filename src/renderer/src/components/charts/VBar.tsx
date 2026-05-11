import { formatCompact } from '@renderer/lib/format'
import { memo } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface VBarProps<T extends object> {
  data: readonly T[]
  xKey: string
  yKey: string
  /** Bar fill — defaults to monotone foreground */
  fill?: string
  maxBarSize?: number
}

/**
 * Vertical bar chart, single series. Fills its container.
 *
 * Y-axis was previously 32px wide with no formatter — overflowing labels
 * collapsed to a single visible "0" on counts ≥1000. `width={44}` +
 * `formatCompact` resolves it.
 */
function VBarInner<T extends object>({
  data,
  xKey,
  yKey,
  fill = 'var(--chart-1)',
  maxBarSize = 32
}: VBarProps<T>): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data as ReadonlyArray<Record<string, unknown>>}
        margin={{ top: 8, right: 8, left: -4, bottom: 0 }}
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
          fill={fill}
          radius={[3, 3, 0, 0]}
          maxBarSize={maxBarSize}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export const VBar = memo(VBarInner) as typeof VBarInner
