import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface HourRadialProps {
  data: Array<{ hour: number; count: number }>
}

/**
 * 24-bar radial chart showing recordings by hour-of-day. Busier hours read
 * brighter (toward --chart-1) via a per-cell colour-mix ramp; quieter hours
 * fade toward --muted. Both tokens flip with theme, so the ramp stays
 * readable in dark mode. Fills its container.
 */
export function HourRadial({ data }: HourRadialProps): React.JSX.Element {
  const max = Math.max(...data.map((d) => d.count), 1)
  const enriched = data.map((d) => ({
    ...d,
    label: `${d.hour}:00`,
    fill: `color-mix(in oklab, var(--chart-1) ${Math.max(8, Math.round((d.count / max) * 100))}%, var(--muted))`
  }))

  return (
    <ResponsiveContainer width="100%" height="100%">
      <RadialBarChart
        innerRadius="20%"
        outerRadius="100%"
        data={enriched}
        startAngle={90}
        endAngle={-270}
      >
        <PolarAngleAxis type="number" domain={[0, max]} tick={false} />
        <Tooltip cursor={{ fill: 'transparent' }} content={<ChartTooltip />} />
        <RadialBar
          dataKey="count"
          cornerRadius={2}
          background={{ fill: 'var(--muted)' }}
          isAnimationActive={false}
        />
      </RadialBarChart>
    </ResponsiveContainer>
  )
}
