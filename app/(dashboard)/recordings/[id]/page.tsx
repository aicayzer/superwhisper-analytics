'use client'

import { useEffect, useRef, useState } from 'react'

import Link from 'next/link'
import { useParams } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import type { Recording } from '@/lib/types'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    weekday: 'long', day: '2-digit', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m === 0) return `${s}s`
  return `${m}m ${rem}s`
}

function fmtSecs(s: number) {
  const m = Math.floor(s)
  const ms = Math.round((s - m) * 10)
  return `${m}.${ms}s`
}

export default function RecordingDetailPage() {
  const { id } = useParams<{ id: string }>()
  const [recording, setRecording] = useState<Recording | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    fetch(`/api/recordings/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return }
        setRecording(d)
      })
      .catch(() => setError('Failed to load recording'))
      .finally(() => setLoading(false))
  }, [id])

  const seekTo = (sec: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = sec
      audioRef.current.play()
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (error || !recording) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">{error ?? 'Recording not found'}</p>
        <Link href="/recordings" className="text-sm underline mt-2 inline-block">Back to recordings</Link>
      </div>
    )
  }

  const activeSegment = recording.segments.findLast((s) => s.start <= currentTime)

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/recordings" className="text-xs text-muted-foreground hover:underline">← Recordings</Link>
          <h1 className="text-lg font-semibold mt-1">{fmtDate(recording.datetime)}</h1>
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="outline">{recording.modeName}</Badge>
            {recording.primaryTopic !== 'Unknown' && <Badge variant="secondary">{recording.primaryTopic}</Badge>}
            {recording.secondaryTopics.map((t) => (
              <Badge key={t} variant="outline" className="text-muted-foreground">{t}</Badge>
            ))}
          </div>
        </div>
        <div className="text-right text-sm text-muted-foreground shrink-0 space-y-0.5">
          <div>{recording.wordCount.toLocaleString()} words</div>
          <div>{fmtDuration(recording.duration)}</div>
          {recording.wordsPerMinute > 0 && <div>{recording.wordsPerMinute} wpm</div>}
          <div>{recording.modelName}</div>
        </div>
      </div>

      {/* Audio player */}
      {recording.hasAudio && (
        <Card>
          <CardContent className="pt-4">
            <audio
              ref={audioRef}
              src={`/api/recordings/${id}/audio`}
              controls
              className="w-full"
              onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
            />
          </CardContent>
        </Card>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Transcript */}
        <Card className="md:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Transcript</CardTitle>
          </CardHeader>
          <CardContent>
            {recording.segments.length > 0 ? (
              <div className="space-y-1 text-sm leading-relaxed">
                {recording.segments.map((seg, i) => (
                  <span
                    key={i}
                    onClick={() => seekTo(seg.start)}
                    className={`cursor-pointer rounded px-0.5 transition-colors ${
                      activeSegment === seg
                        ? 'bg-primary/20 text-primary'
                        : 'hover:bg-muted'
                    }`}
                    title={`${fmtSecs(seg.start)} → ${fmtSecs(seg.end)}`}
                  >
                    {seg.text}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm leading-relaxed">{recording.result || <span className="text-muted-foreground italic">No transcript</span>}</p>
            )}
          </CardContent>
        </Card>

        {/* Filler words */}
        {recording.fillerWordCount > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Filler words</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                {recording.fillerWordCount} fillers ({recording.fillerWordPct.toFixed(1)}% of words)
              </p>
              <div className="space-y-1">
                {Object.entries(recording.fillerBreakdown)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 10)
                  .map(([phrase, count]) => (
                    <div key={phrase} className="flex justify-between text-xs">
                      <span className="text-muted-foreground">{phrase}</span>
                      <span className="font-mono">{count}</span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Metadata */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Metadata</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5 text-xs">
            {[
              ['Model', recording.modelName],
              ['Model key', recording.modelKey],
              ['Language', recording.languageSelected],
              ['Device', recording.recordingDevice],
              ['App version', recording.appVersion],
              ['Sentences', String(recording.sentenceCount)],
              ['Realtime', recording.realtimeEnabled ? 'Yes' : 'No'],
              ['System audio', recording.systemAudioEnabled ? 'Yes' : 'No'],
            ].map(([k, v]) =>
              v ? (
                <div key={k} className="flex justify-between gap-4">
                  <span className="text-muted-foreground">{k}</span>
                  <span className="font-mono truncate max-w-48 text-right">{v}</span>
                </div>
              ) : null
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
