import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface StackedAreaPercentProps {
  /** Each row: { date, [modeKey]: count, ... }. */
  data: Array<Record<string, unknown>>
  xKey: string
  /** Stack keys, in render order. Top of the stack is last. */
  keys: string[]
  formatTick?: (raw: string) => string
}

/**
 * 100% stacked area chart for showing the *mix* of recordings across
 * categories over time. Useful when totals vary day to day but the
 * proportional split is the story (e.g. "what fraction is Default vs
 * Email vs Code each week"). Fills its container.
 *
 * Stack colours come from --chart-1..--chart-5 plus --muted, all of which
 * flip with theme.
 */
export function StackedAreaPercent({
  data,
  xKey,
  keys,
  formatTick
}: StackedAreaPercentProps): React.JSX.Element {
  // Convert raw counts to percentages per row, ignoring zero-total rows
  // (which would render as solid colour gaps).
  const normalised = data.map((row) => {
    const total = keys.reduce((s, k) => s + ((row[k] as number) ?? 0), 0)
    if (total === 0) {
      const out: Record<string, unknown> = { [xKey]: row[xKey] }
      for (const k of keys) out[k] = 0
      return out
    }
    const out: Record<string, unknown> = { [xKey]: row[xKey] }
    for (const k of keys) out[k] = (((row[k] as number) ?? 0) / total) * 100
    return out
  })

  const palette = [
    'var(--chart-1)',
    'var(--chart-2)',
    'var(--chart-3)',
    'var(--chart-4)',
    'var(--chart-5)',
    'var(--muted-foreground)'
  ]

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={normalised} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          tickCount={6}
          tickFormatter={formatTick}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={32}
          domain={[0, 100]}
          tickFormatter={(v) => `${v}%`}
        />
        <Tooltip cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} content={<ChartTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, color: 'var(--muted-foreground)' }}
          iconSize={8}
          iconType="circle"
        />
        {keys.map((k, i) => (
          <Area
            key={k}
            type="monotone"
            dataKey={k}
            stackId="1"
            stroke="none"
            fill={palette[i] ?? 'var(--muted-foreground)'}
            fillOpacity={0.85}
            isAnimationActive={false}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}
