import { Waveform } from '@renderer/components/charts/Waveform'
import { Card } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/cn'
import { formatClock, formatDurationSec, formatTimestamp, truncate } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'
import type { Recording } from '@renderer/lib/types'
import { ArrowLeft, ChevronLeft, ChevronRight, Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

const SCRUB_STEP_SEC = 5

export function TranscriptDetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const ordered = mock.recordings // sorted by datetime desc in mock.ts
  const idx = ordered.findIndex((r) => r.id === id)
  const rec: Recording | undefined = idx >= 0 ? ordered[idx] : undefined

  if (!rec) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-12 text-center">
        <div className="text-xl font-semibold text-foreground">Recording not found</div>
        <Link to="/transcripts" className="text-[13px] text-muted-foreground hover:underline">
          Back to all transcripts
        </Link>
      </div>
    )
  }

  const prev = idx > 0 ? ordered[idx - 1] : null
  const next = idx < ordered.length - 1 ? ordered[idx + 1] : null

  return (
    <DetailView
      key={rec.id}
      rec={rec}
      onPrev={prev ? () => navigate(`/transcripts/${prev.id}`) : null}
      onNext={next ? () => navigate(`/transcripts/${next.id}`) : null}
    />
  )
}

interface DetailViewProps {
  rec: Recording
  onPrev: (() => void) | null
  onNext: (() => void) | null
}

function DetailView({ rec, onPrev, onNext }: DetailViewProps): React.JSX.Element {
  const totalSec = rec.duration / 1000
  const [playing, setPlaying] = useState(false)
  const [currentSec, setCurrentSec] = useState(0)
  const lastTickRef = useRef<number | null>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  const togglePlay = (): void => {
    setPlaying((p) => !p)
  }
  const seekTo = (sec: number): void => {
    setCurrentSec(Math.max(0, Math.min(totalSec, sec)))
  }

  // Mock playback timer.
  useEffect(() => {
    if (!playing) {
      lastTickRef.current = null
      return undefined
    }
    let raf = 0
    const tick = (now: number): void => {
      if (lastTickRef.current === null) lastTickRef.current = now
      const dt = (now - lastTickRef.current) / 1000
      lastTickRef.current = now
      setCurrentSec((c) => {
        const nx = c + dt
        if (nx >= totalSec) {
          setPlaying(false)
          return totalSec
        }
        return nx
      })
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, totalSec])

  // Keyboard shortcuts — Space play/pause, ←/→ scrub. Skip when typing in inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        seekTo(currentSec - SCRUB_STEP_SEC)
      } else if (e.key === 'ArrowRight') {
        e.preventDefault()
        seekTo(currentSec + SCRUB_STEP_SEC)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentSec, totalSec])

  const activeSegmentIndex = useMemo(() => {
    for (let i = rec.segments.length - 1; i >= 0; i--) {
      const seg = rec.segments[i]
      if (seg && currentSec >= seg.start) return i
    }
    return -1
  }, [currentSec, rec.segments])

  // Auto-scroll the active segment into view while playing.
  useEffect(() => {
    if (!playing || activeSegmentIndex < 0 || !transcriptRef.current) return
    const el = transcriptRef.current.querySelector(`[data-seg="${activeSegmentIndex}"]`)
    if (el && el instanceof HTMLElement) {
      const container = transcriptRef.current
      const elTop = el.offsetTop - container.offsetTop
      const elBottom = elTop + el.offsetHeight
      const visibleTop = container.scrollTop
      const visibleBottom = visibleTop + container.clientHeight
      if (elTop < visibleTop || elBottom > visibleBottom) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
  }, [activeSegmentIndex, playing])

  const title = useMemo(() => {
    const firstSentence = rec.result.split(/[.?!]/)[0]?.trim() ?? ''
    if (firstSentence.length > 0) return truncate(firstSentence, 80)
    return `${rec.modeName} recording`
  }, [rec])

  const fillerPct = rec.wordCount > 0 ? (rec.fillerCount / rec.wordCount) * 100 : 0

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          to="/transcripts"
          className="flex items-center gap-1 rounded px-2 py-1 text-[12px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          Transcripts
        </Link>
        <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold tracking-tight text-foreground">
          {title}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={onPrev ?? undefined}
            disabled={!onPrev}
            aria-label="Previous"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
          </button>
          <button
            type="button"
            onClick={onNext ?? undefined}
            disabled={!onNext}
            aria-label="Next"
            className="rounded p-1 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
          </button>
        </div>
      </div>

      {/* Audio player */}
      <Card className="p-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={togglePlay}
            aria-label={playing ? 'Pause' : 'Play'}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
          >
            {playing ? (
              <Pause className="h-3.5 w-3.5" strokeWidth={2.2} fill="currentColor" />
            ) : (
              <Play className="h-3.5 w-3.5 translate-x-px" strokeWidth={2.2} fill="currentColor" />
            )}
          </button>
          <div className="min-w-0 flex-1">
            <Waveform
              peaks={rec.waveform}
              progress={totalSec > 0 ? currentSec / totalSec : 0}
              onSeek={(f) => seekTo(f * totalSec)}
            />
          </div>
          <div className="shrink-0 tabular-nums text-[11px] text-muted-foreground">
            {formatClock(currentSec)} / {formatClock(totalSec)}
          </div>
        </div>
      </Card>

      {/* Detail grid — fills the rest of the viewport */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[1fr_280px]">
        <Card className="flex min-h-0 flex-col p-5">
          <div
            ref={transcriptRef}
            className="min-h-0 flex-1 overflow-y-auto text-[13.5px] leading-relaxed text-foreground"
          >
            {rec.segments.length === 0 ? (
              <p>{rec.result}</p>
            ) : (
              <p>
                {rec.segments
                  .map((seg, i) => {
                    const isActive = i === activeSegmentIndex
                    const isUpcoming = currentSec < seg.start
                    return (
                      <span
                        key={i}
                        data-seg={i}
                        onClick={() => seekTo(seg.start)}
                        className={cn(
                          'cursor-pointer transition-colors',
                          isActive &&
                            'rounded bg-yellow-200/80 px-0.5 py-0 text-foreground dark:bg-yellow-300/30',
                          !isActive && isUpcoming && 'text-muted-foreground/70',
                          !isActive && !isUpcoming && 'hover:bg-foreground/5'
                        )}
                      >
                        {seg.text}
                      </span>
                    )
                  })
                  .reduce<React.ReactNode[]>((acc, node, i) => {
                    if (i > 0) acc.push(' ')
                    acc.push(node)
                    return acc
                  }, [])}
              </p>
            )}
          </div>
        </Card>

        <div className="flex min-h-0 flex-col gap-3 overflow-y-auto">
          <DetailsCard rec={rec} fillerPct={fillerPct} />
          <FillerCard breakdown={rec.fillerBreakdown} />
        </div>
      </div>
    </div>
  )
}

function DetailsCard({ rec, fillerPct }: { rec: Recording; fillerPct: number }): React.JSX.Element {
  return (
    <Card className="p-4 text-[12px]">
      <div className="mb-1 text-[12px] font-semibold tracking-tight text-foreground">Details</div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
        <Row k="Recorded" v={formatTimestamp(rec.datetime)} />
        <Row k="Mode" v={rec.modeName} />
        <Row k="Duration" v={formatDurationSec(rec.duration / 1000)} />
        <Row k="Words" v={rec.wordCount.toLocaleString()} />
        <Row k="Words / minute" v={String(rec.wordsPerMinute)} />
        <Row k="Sentences" v={String(rec.sentenceCount)} />
        <Row k="Filler words" v={`${rec.fillerCount} (${fillerPct.toFixed(1)}%)`} />
        <Row k="Model" v={rec.modelName} />
        {rec.recordingDevice && <Row k="Device" v={rec.recordingDevice} />}
        <Row k="App version" v={rec.appVersion} />
      </dl>
    </Card>
  )
}

function Row({ k, v }: { k: string; v: string }): React.JSX.Element {
  return (
    <>
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right tabular-nums text-foreground">{v}</dd>
    </>
  )
}

function FillerCard({
  breakdown
}: {
  breakdown: Array<{ phrase: string; count: number }>
}): React.JSX.Element {
  if (breakdown.length === 0) {
    return (
      <Card className="p-4 text-[12px] text-muted-foreground">
        <div className="mb-1 text-[12px] font-semibold tracking-tight text-foreground">
          Fillers in this recording
        </div>
        No filler phrases detected.
      </Card>
    )
  }
  const max = breakdown[0]?.count ?? 1
  const top = breakdown.slice(0, 6)
  return (
    <Card className="p-4 text-[12px]">
      <div className="mb-1 text-[12px] font-semibold tracking-tight text-foreground">
        Fillers in this recording
      </div>
      <div className="space-y-1.5">
        {top.map((f) => (
          <div key={f.phrase}>
            <div className="flex items-center justify-between">
              <span className="text-foreground">{f.phrase}</span>
              <span className="tabular-nums text-muted-foreground">{f.count}</span>
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full bg-foreground"
                style={{ width: `${(f.count / max) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
