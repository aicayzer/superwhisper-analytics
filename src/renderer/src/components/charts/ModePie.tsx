import { useMemo } from 'react'
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface ModePieProps {
  data: Array<{ name: string; value: number }>
  /** When true, renders a donut. Default. */
  donut?: boolean
  /** Sub-label drawn inside the donut hole. */
  centreLabel?: string
  /** Sub-sub-label drawn underneath the centre label. */
  centreSubLabel?: string
}

/** Subset of Recharts tooltip render-prop args we care about. The
 *  payload list arrives readonly from Recharts; matching that lets us
 *  pass the function straight to `<Tooltip content={...}>`. */
interface PieTooltipEntry {
  name?: string | number
  value?: string | number | ReadonlyArray<string | number>
  payload?: { fill?: string }
}
interface PieTooltipProps {
  active?: boolean
  payload?: ReadonlyArray<PieTooltipEntry>
}

/**
 * Pie / donut chart for mode share. Slice colours come from the standard
 * `--chart-1..5` ramp, cycling for slices beyond five.
 *
 * Donut variant exposes a centre label slot — handy for surfacing the
 * dominant mode and its percentage. Inner radius is sized as a fraction
 * of the smaller container dimension so the proportions stay sensible
 * regardless of the parent's aspect ratio.
 */
export function ModePie({
  data,
  donut = true,
  centreLabel,
  centreSubLabel
}: ModePieProps): React.JSX.Element {
  // Total is used by the tooltip to show percentages alongside raw counts.
  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data])
  // The render-prop is hoisted because react/prop-types rule treats inline
  // `content={(p) => ...}` as a nameless component; a named wrapper with an
  // explicit type sidesteps it without disabling the rule.
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
        >
          {data.map((_, i) => (
            <Cell key={i} fill={`var(--chart-${(i % 5) + 1})`} />
          ))}
        </Pie>
        <Tooltip content={renderTooltip} />
        {donut && (centreLabel || centreSubLabel) && (
          <text
            x="50%"
            y="50%"
            textAnchor="middle"
            dominantBaseline="middle"
            className="select-none"
            fill="var(--foreground)"
          >
            {centreLabel && (
              <tspan x="50%" dy="-0.2em" style={{ fontSize: 13, fontWeight: 600 }}>
                {centreLabel}
              </tspan>
            )}
            {centreSubLabel && (
              <tspan x="50%" dy="1.4em" style={{ fontSize: 11, fill: 'var(--muted-foreground)' }}>
                {centreSubLabel}
              </tspan>
            )}
          </text>
        )}
      </PieChart>
    </ResponsiveContainer>
  )
}
