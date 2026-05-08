'use client'

import { Area, AreaChart, CartesianGrid, Tooltip, XAxis, YAxis } from 'recharts'

import { ChartContainer } from '@/components/ui/chart'
import type { WeeklyTrend } from '@/lib/types'

interface Props {
  data: WeeklyTrend[]
}

function formatWeek(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function formatNumber(n: number) {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function ActivityChart({ data }: Props) {
  const sliced = data.slice(-26)

  return (
    <ChartContainer config={{ totalWords: { label: 'Words', color: 'var(--chart-1)' } }} className="h-64 w-full">
      <AreaChart data={sliced} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="wordsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.25} />
            <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="week"
          tickFormatter={formatWeek}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          interval={Math.floor(sliced.length / 6)}
        />
        <YAxis
          tickFormatter={formatNumber}
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          width={44}
        />
        <Tooltip
          labelFormatter={(v) => `Week of ${formatWeek(String(v))}`}
          formatter={(v) => [typeof v === 'number' ? v.toLocaleString() : v, 'Words']}
          contentStyle={{ fontSize: 12 }}
        />
        <Area
          type="monotone"
          dataKey="totalWords"
          stroke="var(--chart-1)"
          strokeWidth={2}
          fill="url(#wordsGradient)"
          dot={false}
          activeDot={{ r: 4 }}
        />
      </AreaChart>
    </ChartContainer>
  )
}
