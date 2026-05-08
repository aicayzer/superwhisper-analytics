import { PolarAngleAxis, RadialBar, RadialBarChart, ResponsiveContainer, Tooltip } from 'recharts'
import { ChartTooltip } from './ChartTooltip'

interface HourRadialProps {
  data: Array<{ hour: number; count: number }>
  height?: number
}

/**
 * 24-bar radial chart showing recordings by hour-of-day. Busier hours read
 * darker via a per-cell colour ramp.
 */
export function HourRadial({ data, height = 220 }: HourRadialProps): React.JSX.Element {
  const max = Math.max(...data.map((d) => d.count), 1)
  const enriched = data.map((d) => ({
    ...d,
    label: `${d.hour}:00`,
    fill: `hsl(0 0% ${10 + (1 - d.count / max) * 70}%)`
  }))

  return (
    <ResponsiveContainer width="100%" height={height}>
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
