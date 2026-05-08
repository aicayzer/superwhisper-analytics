'use client'

import { useEffect, useState } from 'react'

import Link from 'next/link'

import { ActivityChart } from '@/components/charts/activity-chart'
import { useProfile } from '@/components/profile-provider'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { DailySummary, OverviewStats, TopicStat, WeeklyTrend } from '@/lib/types'

interface OverviewData {
  overview: OverviewStats
  dailySummaries: DailySummary[]
  weeklyTrends: WeeklyTrend[]
  topicStats: TopicStat[]
}

function fmtDuration(sec: number) {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

function StatCard({ title, value, sub }: { title: string; value: string; sub?: string }) {
  return (
    <Card>
      <CardHeader className="pb-1">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
      </CardContent>
    </Card>
  )
}

export default function OverviewPage() {
  const { profile } = useProfile()
  const [data, setData] = useState<OverviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    const qs = profile === 'on' ? '?profile=on' : ''
    fetch(`/api/stats/overview${qs}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error === 'not_configured') {
          setError('not_configured')
        } else {
          setData(d)
        }
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false))
  }, [profile])

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
        <p className="text-sm text-muted-foreground text-center">Indexing your recordings — this may take a moment on first load…</p>
      </div>
    )
  }

  if (error === 'not_configured') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-12 text-center">
        <p className="text-lg font-medium">SuperWhisper path not configured</p>
        <p className="text-sm text-muted-foreground max-w-sm">
          Point the app at your SuperWhisper data directory to get started.
        </p>
        <Link href="/settings" className="text-sm underline underline-offset-4">
          Open settings
        </Link>
      </div>
    )
  }

  if (error) {
    return <div className="p-6 text-destructive">{error}</div>
  }

  if (!data) return null

  const { overview, weeklyTrends, topicStats } = data
  const topicData = topicStats.map((t) => ({ label: t.topic, value: t.count }))

  return (
    <div className="p-6 space-y-6">
      {profile === 'on' && (
        <div className="text-xs text-muted-foreground border border-border rounded px-3 py-2 bg-muted/30">
          Showing ON (legacy) profile — {overview.dateRange.start} to {overview.dateRange.end}
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Recordings"
          value={overview.totalRecordings.toLocaleString()}
          sub={`across ${overview.totalDays} days`}
        />
        <StatCard
          title="Words dictated"
          value={overview.totalWords >= 1000000
            ? `${(overview.totalWords / 1000000).toFixed(1)}M`
            : `${(overview.totalWords / 1000).toFixed(0)}k`}
          sub={`~${overview.avgWordsPerRecording} per recording`}
        />
        <StatCard
          title="Total time"
          value={fmtDuration(overview.totalDurationSec)}
          sub={`~${fmtDuration(overview.avgDurationSec)} avg`}
        />
        <StatCard
          title="Avg WPM"
          value={overview.avgWPM > 0 ? String(overview.avgWPM) : '—'}
          sub="words per minute"
        />
      </div>

      {/* Weekly activity */}
      {weeklyTrends.length > 0 ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Words per week</CardTitle>
          </CardHeader>
          <CardContent>
            <ActivityChart data={weeklyTrends} />
          </CardContent>
        </Card>
      ) : null}

      {/* Topic distribution */}
      {topicData.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Topic breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {topicData.slice(0, 8).map((t) => (
                  <div key={t.label} className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="truncate">{t.label}</span>
                        <span className="text-muted-foreground shrink-0 ml-2">{t.value.toLocaleString()}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${Math.round((t.value / topicData[0].value) * 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">At a glance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-sm">
                <span className="text-muted-foreground">Date range </span>
                <span className="font-medium">{overview.dateRange.start} → {overview.dateRange.end}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Total recordings </span>
                <span className="font-medium">{overview.totalRecordings.toLocaleString()}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Recording days </span>
                <span className="font-medium">{overview.totalDays}</span>
              </div>
              <div className="text-sm">
                <span className="text-muted-foreground">Avg per day </span>
                <span className="font-medium">
                  {overview.totalDays > 0 ? (overview.totalRecordings / overview.totalDays).toFixed(1) : '—'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
