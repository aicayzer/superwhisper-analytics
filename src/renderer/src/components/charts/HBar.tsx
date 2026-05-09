import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface HBarProps {
  data: Array<Record<string, unknown>>
  xKey: string // value (numeric)
  yKey: string // label (categorical)
  /** Width of the y-axis label gutter */
  labelWidth?: number
}

/**
 * Horizontal bar list — labels on the left, bars to the right. Fills its
 * container. Single fill colour; the visual ranking comes from order alone.
 */
export function HBar({ data, xKey, yKey, labelWidth = 88 }: HBarProps): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey={yKey}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={labelWidth}
        />
        <Tooltip cursor={{ fill: 'var(--accent)' }} content={<ChartTooltip />} />
        <Bar
          dataKey={xKey}
          fill="var(--chart-1)"
          radius={[0, 3, 3, 0]}
          maxBarSize={14}
          isAnimationActive={false}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}
