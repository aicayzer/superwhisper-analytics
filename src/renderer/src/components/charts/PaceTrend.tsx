import {
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface PaceTrendProps {
  /** Monthly aggregate (the line). */
  trend: Array<Record<string, unknown>>
  /** Per-recording values aligned to the same xKey domain (the scatter). */
  dots: Array<{ period: string; value: number }>
  xKey: string
  yKey: string
  /** Optional horizontal target line (e.g. WPM goal). */
  reference?: { value: number; label?: string }
  formatTick?: (raw: string) => string
}

/**
 * Speaking-pace chart variant. Layers a soft scatter of every recording's
 * WPM behind the monthly average line — shows the spread, not just the
 * average. Custom shape because Recharts' ComposedChart needs both series
 * keyed against the same X axis.
 */
export function PaceTrend({
  trend,
  dots,
  xKey,
  yKey,
  reference,
  formatTick
}: PaceTrendProps): React.JSX.Element {
  // Merge series so each row has both the monthly average and any per-row
  // points landing in that period. Recharts doesn't render multiple Scatter
  // points on a categorical axis natively, so jitter slightly within the
  // period bucket using a derived numeric x (still rendered as the category
  // by formatter).
  const merged = trend.map((t) => ({
    [xKey]: t[xKey],
    [yKey]: t[yKey]
  }))

  // Group dots by period for the scatter — Recharts expects rows with
  // numeric x values. We use the same categorical xKey; multiple rows with
  // the same key stack vertically inside the column.
  const dotRows = dots.map((d) => ({ [xKey]: d.period, dotValue: d.value }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart
        data={[...merged, ...dotRows]}
        margin={{ top: 8, right: 8, left: -16, bottom: 0 }}
      >
        <CartesianGrid stroke="var(--border)" strokeDasharray="2 4" vertical={false} />
        <XAxis
          dataKey={xKey}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
          tickCount={6}
          tickFormatter={formatTick}
          allowDuplicatedCategory={false}
        />
        <YAxis
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={32}
        />
        {reference && (
          <ReferenceLine
            y={reference.value}
            stroke="var(--muted-foreground)"
            strokeDasharray="3 4"
            strokeWidth={1}
            label={
              reference.label
                ? {
                    value: reference.label,
                    fill: 'var(--muted-foreground)',
                    fontSize: 10,
                    position: 'right'
                  }
                : undefined
            }
          />
        )}
        <Tooltip cursor={{ stroke: 'var(--border)', strokeWidth: 1 }} content={<ChartTooltip />} />
        <Scatter
          dataKey="dotValue"
          name="Recordings"
          fill="var(--chart-3)"
          fillOpacity={0.35}
          shape="circle"
          isAnimationActive={false}
        />
        <Line
          type="monotone"
          dataKey={yKey}
          name="Monthly avg"
          stroke="var(--chart-1)"
          strokeWidth={1.6}
          dot={false}
          isAnimationActive={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
