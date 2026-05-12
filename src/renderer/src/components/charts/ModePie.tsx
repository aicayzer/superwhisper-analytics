import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface ModePieProps {
  data: Array<{ name: string; value: number }>
  /** When true, renders a donut. Default. */
  donut?: boolean
  /** Slices that account for less than this fraction (0-1) of the total
   *  are left unlabelled — they're surfaced via hover instead. Default
   *  0.08 (8%). Tweak upward on very dense breakdowns. */
  minLabelFraction?: number
}

/** Subset of Recharts tooltip render-prop args we care about. */
interface PieTooltipEntry {
  name?: string | number
  value?: string | number | ReadonlyArray<string | number>
  payload?: { fill?: string }
}
interface PieTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<PieTooltipEntry>
}

/** Recharts label render-prop args we care about. The full type is huge
 *  and not exported cleanly; we type the bits we read. */
interface SliceLabelArgs {
  cx?: number
  cy?: number
  innerRadius?: number
  outerRadius?: number
  midAngle?: number
  percent?: number
  name?: string | number
}

/**
 * Pie / donut chart for mode share. Slice colours come from the standard
 * `--chart-1..5` ramp, cycling for slices beyond five.
 *
 * Slices that are large enough to be readable carry an inline label
 * showing the mode name and percentage. Small slices (< `minLabelFraction`
 * of the total) are deliberately unlabelled so the chart doesn't get
 * crowded — hover them to see the breakdown.
 *
 * No centre label: the dominant-mode `Default 48%` text used to render in
 * the donut hole, but it duplicated the largest slice's inline label and
 * read as a confused tagline. The hole is now empty, which lets the eye
 * resolve the chart shape first.
 */
export function ModePie({
  data,
  donut = true,
  minLabelFraction = 0.08
}: ModePieProps): React.JSX.Element {
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data])

  const renderTooltip = (props: PieTooltipProps): React.JSX.Element => {
    const augmented = (props.payload ?? []).map((entry) => {
      const value = typeof entry.value === 'number' ? entry.value : 0
      const pct = total > 0 ? Math.round((value / total) * 100) : 0
      return {
        name: String(entry.name ?? ''),
        value: `${value} (${pct}%)`,
        color: entry.payload?.fill
      }
    })
    return <ChartTooltip active={props.active} payload={augmented} />
  }

  // Inline slice labels — Recharts gives us cx/cy + midAngle + radii so
  // we can plant the label at the radial midpoint of the slice. The
  // RADIAN -> degree conversion follows the d3-arc convention Recharts
  // uses internally.
  const renderSliceLabel = (args: SliceLabelArgs): React.JSX.Element | null => {
    const {
      cx = 0,
      cy = 0,
      innerRadius = 0,
      outerRadius = 0,
      midAngle = 0,
      percent = 0,
      name = ''
    } = args
    if (percent < minLabelFraction) return null
    const RAD = Math.PI / 180
    const r = innerRadius + (outerRadius - innerRadius) * 0.5
    const x = cx + r * Math.cos(-midAngle * RAD)
    const y = cy + r * Math.sin(-midAngle * RAD)
    return (
      <g pointerEvents="none">
        <text
          x={x}
          y={y - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--foreground)"
          style={{ fontSize: 11, fontWeight: 600 }}
        >
          {String(name)}
        </text>
        <text
          x={x}
          y={y + 7}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--foreground)"
          style={{ fontSize: 10, opacity: 0.75 }}
        >
          {Math.round(percent * 100)}%
        </text>
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={donut ? '55%' : 0}
          outerRadius="85%"
          stroke="var(--card)"
          strokeWidth={1.5}
          isAnimationActive={false}
          paddingAngle={donut ? 1 : 0}
          label={renderSliceLabel}
          labelLine={false}
        >
          {data.map((_, i) => (
            <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
          ))}
        </Pie>
        <Tooltip content={renderTooltip} />
      </PieChart>
    </ResponsiveContainer>
  )
}
