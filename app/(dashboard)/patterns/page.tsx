'use client'

import { useEffect, useState } from 'react'

import { VerticalBarChart } from '@/components/charts/bar-chart-v'
import { ActivityChart } from '@/components/charts/activity-chart'
import { useProfile } from '@/components/profile-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DayOfWeekPattern, HourlyPattern, WeeklyTrend } from '@/lib/types'

interface PatternsData {
  hourlyPatterns: HourlyPattern[]
  dayOfWeek: DayOfWeekPattern[]
  weeklyTrends: WeeklyTrend[]
}

function fmtHour(h: number) {
  if (h === 0) return '12am'
  if (h < 12) return `${h}am`
  if (h === 12) return '12pm'
  return `${h - 12}pm`
}

export default function PatternsPage() {
  const { profile } = useProfile()
  const [data, setData] = useState<PatternsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = profile === 'on' ? '?profile=on' : ''
    fetch(`/api/stats/patterns${qs}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [profile])

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-64" /><Skeleton className="h-64" />
      </div>
      <Skeleton className="h-64" />
    </div>
  )

  if (!data) return null

  const hourData = data.hourlyPatterns.map((h) => ({ label: fmtHour(h.hour), value: h.count }))
  const dowData = data.dayOfWeek.map((d) => ({ label: d.dayName, value: d.count }))
  // Weekly trends in count form for the activity chart — reuse by mapping to WeeklyTrend shape
  const weeklyCountTrends: WeeklyTrend[] = data.weeklyTrends.map((w) => ({ ...w, totalWords: w.count }))

  return (
    <div className="p-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Hour of day</CardTitle>
          </CardHeader>
          <CardContent>
            <VerticalBarChart data={hourData} valueLabel="Recordings" height={240} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Day of week</CardTitle>
          </CardHeader>
          <CardContent>
            <VerticalBarChart data={dowData} color="var(--chart-2)" valueLabel="Recordings" height={240} />
          </CardContent>
        </Card>
      </div>

      {data.weeklyTrends.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Weekly recording volume</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart data={weeklyCountTrends} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
