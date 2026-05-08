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
  height?: number
}

export function VerticalBarChart({ data, color = 'var(--chart-1)', valueLabel = 'Count', height = 220 }: Props) {
  return (
    <ChartContainer
      config={{ value: { label: valueLabel, color } }}
      className="w-full"
      style={{ height }}
    >
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} width={40} />
        <Tooltip
          formatter={(v) => [typeof v === 'number' ? v.toLocaleString() : v, valueLabel]}
          contentStyle={{ fontSize: 12 }}
        />
        <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} maxBarSize={48} />
      </BarChart>
    </ChartContainer>
  )
}
