'use client'

import { Bar, BarChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartContainer } from '@/components/ui/chart'

interface DataPoint {
  label: string
  value: number
}

interface Props {
  data: DataPoint[]
  color?: string
  valueLabel?: string
  maxItems?: number
}

export function HorizontalBarChart({ data, color = 'var(--chart-2)', valueLabel = 'Count', maxItems = 20 }: Props) {
  const sliced = data.slice(0, maxItems)
  const height = Math.max(200, sliced.length * 28)

  return (
    <ChartContainer
      config={{ value: { label: valueLabel, color } }}
      className="w-full"
      style={{ height }}
    >
      <BarChart data={sliced} layout="vertical" margin={{ top: 0, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={90}
        />
        <Tooltip
          formatter={(v) => [typeof v === 'number' ? v.toLocaleString() : v, valueLabel]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="value" fill={color} radius={[0, 3, 3, 0]} maxBarSize={20} />
      </BarChart>
    </ChartContainer>
  )
}
