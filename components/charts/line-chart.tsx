'use client'

import { CartesianGrid, Line, LineChart, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartContainer } from '@/components/ui/chart'

interface DataPoint {
  label: string
  value: number
}

interface Props {
  data: DataPoint[]
  color?: string
  valueLabel?: string
  height?: number
}

function formatDate(s: string) {
  return new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

export function TrendLineChart({ data, color = 'var(--chart-1)', valueLabel = 'Value', height = 220 }: Props) {
  const interval = Math.max(1, Math.floor(data.length / 8))

  return (
    <ChartContainer
      config={{ value: { label: valueLabel, color } }}
      className="w-full"
      style={{ height }}
    >
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="label"
          tickFormatter={formatDate}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={interval}
        />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          labelFormatter={(v) => formatDate(String(v))}
          formatter={(v) => [typeof v === 'number' ? v.toLocaleString() : v, valueLabel]}
          contentStyle={{ fontSize: 12 }}
        />
        <Line
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ChartContainer>
  )
}
