import { WordsCard } from '@renderer/components/transcripts/WordsCard'
import { Card } from '@renderer/components/ui/card'
import { IconButton } from '@renderer/components/ui/IconButton'
import { cn } from '@renderer/lib/cn'
import { formatClock, formatDurationSec, formatTimestamp } from '@renderer/lib/format'
import type { Recording } from '@renderer/lib/types'
import { useConfigStore } from '@renderer/state/configStore'
import { useDataStore } from '@renderer/state/dataStore'
import { useUiPrefsStore } from '@renderer/state/uiPrefsStore'
import { Copy, Pause, Play } from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

const SCRUB_STEP_SEC = 5

export function TranscriptDetail(): React.JSX.Element {
  const { id } = useParams<{ id: string }>()
  const recordings = useDataStore((s) => s.recordings)
  const rec: Recording | undefined = recordings.find((r) => r.id === id)

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
  const transcriptsOnly = useConfigStore((s) => s.transcriptsOnly)
  const [playing, setPlaying] = useState(false)
  const [currentSec, setCurrentSec] = useState(0)
  // Block view (segments with [m:ss] prefixes) is the default. The
  // preference lives in uiPrefsStore so it persists across reloads; the
  // user flips it in Settings.
  const viewMode = useUiPrefsStore((s) => s.transcriptViewMode)
  const [hoveredWord, setHoveredWord] = useState<string | null>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const transcriptRef = useRef<HTMLDivElement>(null)

  // URL host is the literal "recording" (not the recording id) -- see the
  // long-form comment in src/main/protocol.ts for why. The id lives in
  // the path so Chromium's URL parser doesn't treat numeric ids as IPv4.
  const audioUrl = `sw://recording/${rec.id}/output.wav`

  const togglePlay = (): void => {
    const el = audioRef.current
    if (!el) return
    if (el.paused) void el.play()
    else el.pause()
  }
  const seekTo = (sec: number): void => {
    const clamped = Math.max(0, Math.min(totalSec, sec))
    const el = audioRef.current
    if (el) el.currentTime = clamped
    setCurrentSec(clamped)
  }

  // Drive currentSec from the audio element's clock at frame rate while
  // playing -- onTimeUpdate fires only ~4x/s, which feels jittery on the
  // playhead. The audio element is the source of truth either way; the
  // RAF just samples it more often.
  useEffect(() => {
    if (!playing) return undefined
    let raf = 0
    const tick = (): void => {
      const el = audioRef.current
      if (el) setCurrentSec(el.currentTime)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing])

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

  const fillerPct = rec.wordCount > 0 ? (rec.fillerCount / rec.wordCount) * 100 : 0
  const progress = totalSec > 0 ? currentSec / totalSec : 0

  return (
    <div className="flex h-full flex-col gap-3">
      {/* Hidden <audio> drives playback. State synced via the four event
          handlers; currentSec sampled at frame rate by the effect above.
          Skipped entirely when transcripts-only mode is on. */}
      {!transcriptsOnly && (
        <audio
          ref={audioRef}
          src={audioUrl}
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false)
            setCurrentSec(totalSec)
          }}
          onError={(e) => {
            // Fail quietly -- the play button just won't do anything.
            console.warn('[TranscriptDetail] audio error', audioUrl, e)
          }}
        />
      )}

      {/* Top KPI strip -- Mode / Duration / Words / WPM lift out of the
          Details card so they're scannable without scrolling and the
          transcript gets the full left column. */}
      <KpiStrip rec={rec} />

      {/* Detail grid: transcript on the left, audio + details + words on
          the right. Transcript fills the full left column height. */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 lg:grid-cols-[1fr_280px]">
        <Card className="flex min-h-0 flex-col p-5">
          <div
            ref={transcriptRef}
            className="fade-y-mask min-h-0 flex-1 overflow-y-auto text-[13.5px] leading-relaxed text-foreground"
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
          {!transcriptsOnly && (
            <AudioCard
              playing={playing}
              progress={progress}
              currentSec={currentSec}
              totalSec={totalSec}
              onTogglePlay={togglePlay}
              onSeek={(f) => seekTo(f * totalSec)}
            />
          )}
          <DetailsCard rec={rec} fillerPct={fillerPct} />
          <WordsCard rec={rec} hoveredWord={hoveredWord} onHover={setHoveredWord} />
        </div>
      </div>
    </div>
  )
}

// ---------- KPI strip ----------------------------------------------------

function KpiStrip({ rec }: { rec: Recording }): React.JSX.Element {
  const items: Array<{ label: string; value: string }> = [
    { label: 'Mode', value: rec.modeName },
    { label: 'Duration', value: formatDurationSec(rec.duration / 1000) },
    { label: 'Words', value: rec.wordCount.toLocaleString() },
    { label: 'WPM', value: String(rec.wordsPerMinute) }
  ]
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {items.map((it) => (
        <Card key={it.label} className="px-4 py-3">
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {it.label}
          </div>
          <div className="mt-1.5 truncate text-[20px] font-semibold leading-none tabular-nums text-foreground">
            {it.value}
          </div>
        </Card>
      ))}
    </div>
  )
}

// ---------- Audio card ---------------------------------------------------

interface AudioCardProps {
  playing: boolean
  progress: number
  currentSec: number
  totalSec: number
  onTogglePlay: () => void
  onSeek: (frac: number) => void
}

/**
 * Compact audio player. Slots into the right column above DetailsCard.
 * Replaces the earlier full-width waveform card -- the waveform was gone
 * because real recordings often produce near-flat peaks (quiet speech +
 * coarse decimation) that render as essentially a flat line anyway.
 *
 * A thin track with a filled portion + playhead carries the same
 * information without the visual disappointment, and stays useful even
 * for short or silent recordings.
 */
function AudioCard({
  playing,
  progress,
  currentSec,
  totalSec,
  onTogglePlay,
  onSeek
}: AudioCardProps): React.JSX.Element {
  return (
    <Card className="p-3">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={onTogglePlay}
          aria-label={playing ? 'Pause' : 'Play'}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-colors hover:bg-primary/90"
        >
          {playing ? (
            <Pause className="h-3 w-3" strokeWidth={2.2} fill="currentColor" />
          ) : (
            <Play className="h-3 w-3 translate-x-px" strokeWidth={2.2} fill="currentColor" />
          )}
        </button>
        <div className="min-w-0 flex-1">
          <AudioProgressBar progress={progress} onSeek={onSeek} />
        </div>
      </div>
      <div className="mt-2 flex items-center justify-between text-[10.5px] tabular-nums text-muted-foreground">
        <span>{formatClock(currentSec)}</span>
        <span>{formatClock(totalSec)}</span>
      </div>
    </Card>
  )
}

interface AudioProgressBarProps {
  /** Elapsed fraction in [0, 1]. */
  progress: number
  /** Called with a fraction 0..1 when the user clicks or drags. */
  onSeek: (frac: number) => void
}

/**
 * Thin progress bar with a playhead marker. Hosts the click/drag-to-seek
 * affordance that the old Waveform component provided, minus the peaks
 * rendering. Visual surface is a 2px-tall track, foreground-tinted from 0
 * to `progress` with a 10px playhead dot.
 */
function AudioProgressBar({ progress, onSeek }: AudioProgressBarProps): React.JSX.Element {
  const trackRef = useRef<HTMLDivElement>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    const onMove = (e: PointerEvent): void => {
      if (!draggingRef.current || !trackRef.current) return
      const rect = trackRef.current.getBoundingClientRect()
      const f = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      onSeek(f)
    }
    const onUp = (): void => {
      draggingRef.current = false
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [onSeek])

  const handleDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    if (!trackRef.current) return
    draggingRef.current = true
    const rect = trackRef.current.getBoundingClientRect()
    const f = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(f)
  }

  // Cushion the clickable area with vertical padding so the 2px track isn't
  // a comically small hit target -- the inner track stays 2px, outer flex
  // container makes ~14px of hit zone.
  const pct = Math.max(0, Math.min(100, progress * 100))
  return (
    <div
      ref={trackRef}
      onPointerDown={handleDown}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={progress}
      className="relative flex h-3.5 cursor-pointer items-center select-none"
    >
      <div className="h-[2px] w-full overflow-hidden rounded-full bg-foreground/15">
        <div className="h-full bg-foreground" style={{ width: `${pct}%` }} />
      </div>
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground shadow-[0_0_0_2px_var(--card)]"
        style={{ left: `${pct}%` }}
      />
    </div>
  )
}

// ---------- Transcript views --------------------------------------------

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

// ---------- Details + Row -----------------------------------------------

function DetailsCard({ rec, fillerPct }: { rec: Recording; fillerPct: number }): React.JSX.Element {
  const copy = (): void => {
    void navigator.clipboard.writeText(rec.result)
  }
  return (
    <Card className="p-4 text-[12px]">
      <div className="mb-2 flex items-center justify-between text-[12px] font-semibold tracking-tight text-foreground">
        <span>Details</span>
        <IconButton onClick={copy} aria-label="Copy transcript" title="Copy transcript">
          <Copy className="h-3.5 w-3.5" strokeWidth={1.8} />
        </IconButton>
      </div>
      {/* Mode / Duration / Words / WPM now live in the top KPI strip -- the
          remaining rows are the per-recording metadata that doesn't earn a
          tile of its own. */}
      <dl className="flex flex-col gap-y-1">
        <Row k="Recorded" v={formatTimestamp(rec.datetime)} />
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
    <div className="flex items-baseline justify-between gap-3">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right tabular-nums text-foreground">{v}</dd>
    </div>
  )
}
