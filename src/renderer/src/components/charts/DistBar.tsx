import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface DistBarProps {
  data: Array<Record<string, unknown>>
  /** Bucket label key — shown on X axis */
  xKey: string
  /** Numeric value key */
  yKey: string
  height?: number
}

/**
 * Vertical bar chart over labelled buckets — duration distribution,
 * sentence-length distribution etc. Slightly muted fill to distinguish
 * from the primary VBar.
 */
export function DistBar({ data, xKey, yKey, height = 220 }: DistBarProps): React.JSX.Element {
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
          fill="var(--chart-2)"
          radius={[3, 3, 0, 0]}
          maxBarSize={36}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
