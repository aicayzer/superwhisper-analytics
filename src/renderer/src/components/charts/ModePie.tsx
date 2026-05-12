import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface ModePieProps {
  data: Array<{ name: string; value: number }>
  /** When true, renders a donut. Default. */
  donut?: boolean
  /** Slices that account for less than this fraction (0-1) of the total
   *  are left unlabelled — they're surfaced via hover instead. Default
   *  0.04 (4%). */
  minLabelFraction?: number
}

interface PieTooltipEntry {
  name?: string | number
  value?: string | number | ReadonlyArray<string | number>
  payload?: { fill?: string }
}
interface PieTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<PieTooltipEntry>
}

interface SliceLabelArgs {
  cx?: number
  cy?: number
  innerRadius?: number
  outerRadius?: number
  midAngle?: number
  percent?: number
  name?: string | number
  fill?: string
}

/**
 * Donut chart for mode share. Slice colours come from the standard
 * `--chart-1..5` ramp, cycling for slices beyond five.
 *
 * Labels render OUTSIDE the donut with short leader lines pointing to
 * each slice. Outside labels are more readable than inside labels for a
 * compact donut and survive thin slices much better — a slice carrying
 * 4% of the total still has a tiny coloured strip on the donut, and
 * the leader line + outside label make it identifiable. Slices below
 * `minLabelFraction` skip the label and stay hoverable-only so the
 * leader lines don't cluster.
 *
 * Donut radii are set so the outside labels + leader lines have room
 * inside the chart's bounding box without overlapping the slices.
 */
export function ModePie({
  data,
  donut = true,
  minLabelFraction = 0.04
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

  // Outside leader-line label renderer. We compute three points:
  //   • s — the point on the slice (at the outer radius)
  //   • m — an elbow point pulled outward
  //   • e — the label anchor (a touch further out, on the side of the donut)
  // Recharts' d3-arc convention has angle increasing counter-clockwise
  // and 0° on the right, so we flip the sine to match screen-y.
  const renderSliceLabel = (args: SliceLabelArgs): React.JSX.Element | null => {
    const {
      cx = 0,
      cy = 0,
      outerRadius = 0,
      midAngle = 0,
      percent = 0,
      name = '',
      fill = 'var(--foreground)'
    } = args
    if (percent < minLabelFraction) return null
    const RAD = Math.PI / 180
    const sin = Math.sin(-midAngle * RAD)
    const cos = Math.cos(-midAngle * RAD)
    const sx = cx + outerRadius * cos
    const sy = cy + outerRadius * sin
    const mx = cx + (outerRadius + 8) * cos
    const my = cy + (outerRadius + 8) * sin
    const isRightSide = cos >= 0
    const ex = mx + (isRightSide ? 16 : -16)
    const ey = my
    const textAnchor = isRightSide ? 'start' : 'end'
    const labelX = ex + (isRightSide ? 4 : -4)
    return (
      <g pointerEvents="none">
        <path
          d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
          stroke={fill}
          strokeOpacity={0.55}
          fill="none"
        />
        <circle cx={ex} cy={ey} r={1.5} fill={fill} fillOpacity={0.7} />
        <text
          x={labelX}
          y={ey - 4}
          textAnchor={textAnchor}
          fill="var(--foreground)"
          style={{ fontSize: 11, fontWeight: 600 }}
        >
          {String(name)}
        </text>
        <text
          x={labelX}
          y={ey + 8}
          textAnchor={textAnchor}
          fill="var(--muted-foreground)"
          style={{ fontSize: 10 }}
        >
          {Math.round(percent * 100)}%
        </text>
      </g>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      {/* Generous horizontal margin so the outside labels (~70px wide on
          each side at the chart's longest names) have room without
          clipping. The donut radii are kept small as a fraction of the
          container so the leader lines fit too. */}
      <PieChart margin={{ top: 8, right: 56, bottom: 8, left: 56 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={donut ? '55%' : 0}
          outerRadius="70%"
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
