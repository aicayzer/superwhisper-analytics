import { Waveform } from '@renderer/components/charts/Waveform'
import { WordsCard } from '@renderer/components/transcripts/WordsCard'
import { Card } from '@renderer/components/ui/card'
import { IconButton } from '@renderer/components/ui/IconButton'
import { cn } from '@renderer/lib/cn'
import { formatClock, formatDurationSec, formatTimestamp } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'
import type { Recording } from '@renderer/lib/types'
import { useHeaderActions } from '@renderer/state/headerStore'
import { AlignJustify, AlignLeft, Copy, Pause, Play } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const SCRUB_STEP_SEC = 5

type ViewMode = 'inline' | 'block'

export function TranscriptDetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const rec: Recording | undefined = mock.recordings.find((r) => r.id === id)

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

  return <DetailView key={rec.id} rec={rec} />
}

function DetailView({ rec }: { rec: Recording }): React.JSX.Element {
  const totalSec = rec.duration / 1000
  const [playing, setPlaying] = useState(false)
  const [currentSec, setCurrentSec] = useState(0)
  // Block view (segments with [m:ss] prefixes) is the default — segment
  // timestamps are usually what users want when scanning a transcript.
  // The navbar toggle still flips back to flowing inline prose.
  const [viewMode, setViewMode] = useState<ViewMode>('block')
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)
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

  // Keyboard shortcuts: Space play/pause, arrow keys scrub. Ignore typing.
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

  // Register Copy + view-toggle into the navbar slot. Recreated when the
  // recording or view mode changes; useHeaderActions handles cleanup.
  const headerActions = useMemo(
    () => (
      <>
        <IconButton
          onClick={() => {
            void navigator.clipboard.writeText(rec.result)
          }}
          aria-label="Copy transcript"
          title="Copy transcript"
        >
          <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
        </IconButton>
        <IconButton
          onClick={() => setViewMode((v) => (v === 'inline' ? 'block' : 'inline'))}
          aria-label={viewMode === 'inline' ? 'Show segment timestamps' : 'Show inline view'}
          title={viewMode === 'inline' ? 'Show segment timestamps' : 'Show inline view'}
        >
          {viewMode === 'inline' ? (
            <AlignJustify className="h-3.5 w-3.5" strokeWidth={1.8} />
          ) : (
            <AlignLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
          )}
        </IconButton>
      </>
    ),
    [rec.result, viewMode]
  )
  useHeaderActions(headerActions)

  const fillerPct = rec.wordCount > 0 ? (rec.fillerCount / rec.wordCount) * 100 : 0

  return (
    <div className="flex h-full flex-col gap-3">
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

      {/* Detail grid: fills the rest of the viewport */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[1fr_280px]">
        <Card className="flex min-h-0 flex-col p-5">
          <div
            ref={transcriptRef}
            className="min-h-0 flex-1 overflow-y-auto text-[13.5px] leading-relaxed text-foreground"
          >
            {rec.segments.length === 0 ? (
              <p>{highlightWord(rec.result, hoveredWord)}</p>
            ) : viewMode === 'inline' ? (
              <InlineTranscript
                segments={rec.segments}
                activeIndex={activeSegmentIndex}
                currentSec={currentSec}
                hoveredWord={hoveredWord}
                onSeek={seekTo}
              />
            ) : (
              <BlockTranscript
                segments={rec.segments}
                activeIndex={activeSegmentIndex}
                currentSec={currentSec}
                hoveredWord={hoveredWord}
                onSeek={seekTo}
              />
            )}
          </div>
        </Card>

        <div className="flex min-h-0 flex-col gap-3">
          <DetailsCard rec={rec} fillerPct={fillerPct} />
          <WordsCard rec={rec} hoveredWord={hoveredWord} onHover={setHoveredWord} />
        </div>
      </div>
    </div>
  )
}

interface TranscriptViewProps {
  segments: Recording['segments']
  activeIndex: number
  currentSec: number
  hoveredWord: string | null
  onSeek: (sec: number) => void
}

function InlineTranscript({
  segments,
  activeIndex,
  currentSec,
  hoveredWord,
  onSeek
}: TranscriptViewProps): React.JSX.Element {
  // When a word is hovered the per-token highlight is the visual cue;
  // suppress the segment-level active style so the two don't fight.
  const wordHover = hoveredWord !== null
  return (
    <p>
      {segments.map((seg, i) => {
        const isActive = i === activeIndex
        const showActive = isActive && !wordHover
        const isUpcoming = currentSec < seg.start
        return (
          <Fragment key={i}>
            {i > 0 && ' '}
            <span
              data-seg={i}
              onClick={() => onSeek(seg.start)}
              className={cn(
                'cursor-pointer transition-colors',
                showActive && 'rounded bg-accent-blue-bg px-0.5 py-0 text-accent-blue',
                !showActive && isUpcoming && 'text-muted-foreground/70',
                !showActive && !isUpcoming && 'hover:bg-foreground/5'
              )}
            >
              {highlightWord(seg.text, hoveredWord)}
            </span>
          </Fragment>
        )
      })}
    </p>
  )
}

function BlockTranscript({
  segments,
  activeIndex,
  currentSec,
  hoveredWord,
  onSeek
}: TranscriptViewProps): React.JSX.Element {
  const wordHover = hoveredWord !== null
  return (
    <div className="flex flex-col gap-1">
      {segments.map((seg, i) => {
        const isActive = i === activeIndex
        const showActive = isActive && !wordHover
        const isUpcoming = currentSec < seg.start
        return (
          <button
            key={i}
            type="button"
            data-seg={i}
            onClick={() => onSeek(seg.start)}
            className={cn(
              'flex items-start gap-3 rounded px-2 py-1.5 text-left transition-colors',
              showActive && 'bg-accent-blue-bg text-accent-blue',
              !showActive && isUpcoming && 'text-muted-foreground/70 hover:bg-foreground/5',
              !showActive && !isUpcoming && 'text-foreground hover:bg-foreground/5'
            )}
          >
            <span
              className={cn(
                'shrink-0 pt-px tabular-nums text-[11.5px]',
                showActive ? 'text-accent-blue/80' : 'text-muted-foreground'
              )}
            >
              {formatClock(seg.start)}
            </span>
            <span className="min-w-0 flex-1">{highlightWord(seg.text, hoveredWord)}</span>
          </button>
        )
      })}
    </div>
  )
}

/**
 * Wraps every case-insensitive whole-word match of `word` in a <mark> with
 * accent-blue styling. Returns the raw string when no word is hovered.
 *
 * Word-boundary regex avoids highlighting partials (so hovering "cat"
 * doesn't light up "category"). The hovered word arrives already
 * lowercase from tokenise().
 */
function highlightWord(text: string, word: string | null): React.ReactNode {
  if (!word) return text
  // Defensive escape in case tokenise leaves apostrophes in.
  const safe = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const re = new RegExp(`\\b(${safe})\\b`, 'gi')
  const parts: React.ReactNode[] = []
  let last = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    parts.push(
      <mark key={`${m.index}-${m[0]}`} className="bg-accent-blue-bg text-accent-blue">
        {m[0]}
      </mark>
    )
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts.length > 0 ? parts : text
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
