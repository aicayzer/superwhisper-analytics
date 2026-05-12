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
 * sentence-length distribution etc. Fills its container.
 *
 * Y-axis labels are rendered with a custom tick component that left-
 * anchors them at the chart's left edge. The default Recharts y-axis
 * right-anchors labels inside its `width` box, which placed them well
 * inside the card and read as misaligned against the card title. A
 * left-anchored custom tick (and a small left margin) puts the y-axis
 * label values flush with the card title's x position.
 */
function DistBarInner<T extends object>({ data, xKey, yKey }: DistBarProps<T>): React.JSX.Element {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={data as ReadonlyArray<Record<string, unknown>>}
        margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
      >
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={YTick}
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

/**
 * Custom Y-axis tick: left-anchors the label at x=0 of the chart so the
 * value text starts at the card's left edge (visually aligned with the
 * card title). The native YAxis tick right-anchors inside the YAxis
 * `width` box, which left the labels visibly offset from the title.
 */
// Recharts' YAxisTickContentProps types `x` / `y` as `number | string`,
// so we accept both and coerce. Realistically Recharts only emits
// numbers — the loose type is a known quirk.
interface YTickProps {
  x?: number | string
  y?: number | string
  payload?: { value: number | string }
}

function YTick(props: YTickProps): React.JSX.Element {
  const value = props.payload?.value ?? ''
  return (
    <text
      x={0}
      y={typeof props.y === 'number' ? props.y : Number(props.y) || 0}
      dy={4}
      fontSize={11}
      fill="var(--muted-foreground)"
      textAnchor="start"
    >
      {formatCompact(Number(value))}
    </text>
  )
}

export const DistBar = memo(DistBarInner) as typeof DistBarInner
