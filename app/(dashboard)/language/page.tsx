'use client'

import { useEffect, useState } from 'react'

import { HorizontalBarChart } from '@/components/charts/bar-chart-h'
import { TrendLineChart } from '@/components/charts/line-chart'
import { useProfile } from '@/components/profile-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { FillerSummary, WordFrequency, WPMTrend } from '@/lib/types'

interface LanguageData {
  wordFrequency: WordFrequency[]
  fillerSummary: FillerSummary[]
  wpmTrend: WPMTrend[]
}

export default function LanguagePage() {
  const { profile } = useProfile()
  const [data, setData] = useState<LanguageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    const qs = profile === 'on' ? '?profile=on' : ''
    fetch(`/api/stats/language${qs}`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [profile])

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="grid md:grid-cols-2 gap-4">
        <Skeleton className="h-96" /><Skeleton className="h-96" />
      </div>
      <Skeleton className="h-64" />
    </div>
  )

  if (!data) return null

  const wordData = data.wordFrequency.slice(0, 20).map((w) => ({ label: w.word, value: w.count }))
  const fillerData = data.fillerSummary.map((f) => ({ label: f.phrase, value: f.count }))
  const wpmData = data.wpmTrend.map((w) => ({ label: w.date, value: w.avgWPM }))

  return (
    <div className="p-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Top 20 words</CardTitle>
          </CardHeader>
          <CardContent>
            {wordData.length > 0
              ? <HorizontalBarChart data={wordData} valueLabel="Occurrences" maxItems={20} />
              : <p className="text-sm text-muted-foreground">No data</p>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Filler words</CardTitle>
          </CardHeader>
          <CardContent>
            {fillerData.length > 0
              ? <HorizontalBarChart data={fillerData} color="var(--chart-3)" valueLabel="Count" maxItems={15} />
              : <p className="text-sm text-muted-foreground">No filler words detected</p>}
          </CardContent>
        </Card>
      </div>

      {wpmData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Speaking rate over time (daily avg WPM)</CardTitle>
          </CardHeader>
          <CardContent>
            <TrendLineChart data={wpmData} valueLabel="WPM" height={240} />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
