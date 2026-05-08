'use client'

import { useEffect, useState } from 'react'

import { HorizontalBarChart } from '@/components/charts/bar-chart-h'
import { useProfile } from '@/components/profile-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { ModeStat } from '@/lib/types'

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export default function ModesPage() {
  const { profile } = useProfile()
  const [modeStats, setModeStats] = useState<ModeStat[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = profile === 'on' ? '?profile=on' : ''
    fetch(`/api/stats/modes${qs}`)
      .then((r) => r.json())
      .then((d) => setModeStats(d.modeStats ?? []))
      .finally(() => setLoading(false))
  }, [profile])

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-64" /><Skeleton className="h-64" />
      </div>
      <Skeleton className="h-48" />
    </div>
  )

  const countData = modeStats.map((m) => ({ label: m.modeName, value: m.count }))
  const wordsData = modeStats.map((m) => ({ label: m.modeName, value: m.totalWords }))

  return (
    <div className="p-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Recordings by mode</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={countData} valueLabel="Recordings" maxItems={15} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Words by mode</CardTitle>
          </CardHeader>
          <CardContent>
            <HorizontalBarChart data={wordsData} color="var(--chart-2)" valueLabel="Words" maxItems={15} />
          </CardContent>
        </Card>
      </div>

      {/* Detail table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium">Mode breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-muted-foreground border-b border-border">
                  <th className="pb-2 font-medium">Mode</th>
                  <th className="pb-2 font-medium text-right">Recordings</th>
                  <th className="pb-2 font-medium text-right">Words</th>
                  <th className="pb-2 font-medium text-right">Time</th>
                  <th className="pb-2 font-medium text-right">Avg WPM</th>
                </tr>
              </thead>
              <tbody>
                {modeStats.map((m) => (
                  <tr key={m.modeName} className="border-b border-border/50 last:border-0">
                    <td className="py-2 font-medium">{m.modeName}</td>
                    <td className="py-2 text-right text-muted-foreground">{m.count.toLocaleString()}</td>
                    <td className="py-2 text-right text-muted-foreground">{m.totalWords.toLocaleString()}</td>
                    <td className="py-2 text-right text-muted-foreground">{fmtDuration(m.totalDurationSec)}</td>
                    <td className="py-2 text-right text-muted-foreground">{m.avgWPM > 0 ? m.avgWPM : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
