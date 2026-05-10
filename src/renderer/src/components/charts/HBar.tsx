import { memo } from 'react'
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
 *
 * `interval={0}` on the Y-axis forces every category label to render. Without
 * it Recharts skips labels when the available height shrinks, which produces
 * the bar-vs-label misalignment seen on Top words with 12+ items. `margin.left`
 * gets a 4px nudge so the leftmost characters don't kiss the card edge.
 */
function HBarInner({ data, xKey, yKey, labelWidth = 88 }: HBarProps): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart layout="vertical" data={data} margin={{ top: 4, right: 12, left: 4, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey={yKey}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={labelWidth}
          interval={0}
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

export const HBar = memo(HBarInner)
