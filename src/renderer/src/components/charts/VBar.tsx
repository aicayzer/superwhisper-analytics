import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface VBarProps {
  data: Array<Record<string, unknown>>
  xKey: string
  yKey: string
  height?: number
  /** Bar fill — defaults to monotone foreground */
  fill?: string
  maxBarSize?: number
}

/**
 * Vertical bar chart, single series. Simple and dense.
 */
export function VBar({
  data,
  xKey,
  yKey,
  height = 220,
  fill = 'var(--chart-1)',
  maxBarSize = 32
}: VBarProps): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
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
          width={32}
          allowDecimals={false}
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
