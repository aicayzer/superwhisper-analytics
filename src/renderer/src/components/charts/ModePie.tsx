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
      innerRadius = 0,
      outerRadius = 0,
      midAngle = 0,
      percent = 0,
      name = '',
      fill = 'var(--foreground)'
    } = args
    if (percent < minLabelFraction) return null

    // Dominant-slice fallback: when a slice is ≥85% of the total there
    // isn't a sensible side of the donut to anchor an outside label to —
    // the leader line ends up rendering past the card edge and clips the
    // label text (see "100% Default" case where "Default" became
    // ")efault" against a narrow card). For that case we drop the leader
    // line entirely and render the label centred in the donut hole.
    if (percent >= 0.85) {
      return (
        <g pointerEvents="none">
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--foreground)"
            style={{ fontSize: 12, fontWeight: 600 }}
          >
            {String(name)}
          </text>
          <text
            x={cx}
            y={cy + 9}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="var(--muted-foreground)"
            style={{ fontSize: 11 }}
          >
            {Math.round(percent * 100)}%
          </text>
        </g>
      )
    }

    const RAD = Math.PI / 180
    const sin = Math.sin(-midAngle * RAD)
    const cos = Math.cos(-midAngle * RAD)
    const sx = cx + outerRadius * cos
    const sy = cy + outerRadius * sin
    // Leader elbow + horizontal stub trimmed from 8/16 to 6/10. The old
    // distances were generous enough that a right-side narrow slice
    // (e.g. "Meeting" at 10% on a 440px card) ended up with the label
    // anchor past the card's right edge — text was getting clipped. The
    // tighter leader keeps every label inside the chart's right margin
    // (still 44px in the PieChart `margin` prop) while staying readable.
    const mx = cx + (outerRadius + 6) * cos
    const my = cy + (outerRadius + 6) * sin
    const isRightSide = cos >= 0
    const ex = mx + (isRightSide ? 10 : -10)
    const ey = my
    const textAnchor = isRightSide ? 'start' : 'end'
    const labelX = ex + (isRightSide ? 3 : -3)
    // Reference innerRadius to silence unused-destructure warnings; the
    // value is only consulted in the dominant-slice branch above.
    void innerRadius
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
      {/* Margin balance: enough horizontal room for outside labels +
          their short leader lines without the donut feeling dwarfed.
          Bumped from 44 → 52 alongside a tighter leader geometry (see
          renderSliceLabel) so a narrow right-side slice's label can't
          clip against the card edge on smaller cards. */}
      <PieChart margin={{ top: 8, right: 52, bottom: 8, left: 52 }}>
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={donut ? '45%' : 0}
          outerRadius="82%"
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
