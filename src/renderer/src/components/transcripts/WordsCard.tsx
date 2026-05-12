import { Card } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/cn'
import { tokenise } from '@shared/text-metrics'
import type { Recording } from '@renderer/lib/types'
import { useMemo } from 'react'

interface WordsCardProps {
  rec: Recording
  /** Word currently hovered in the list (lifted to TranscriptDetail so the
   *  transcript on the left can highlight every matching token). */
  hoveredWord: string | null
  onHover: (word: string | null) => void
}

/**
 * Per-recording word frequency. Replaces the old "Fillers in this recording"
 * card. Scrollable inside the right column; hovering a row lights up the
 * matching tokens in the transcript via lifted hover state.
 *
 * Counting uses the shared `tokenise()` so stop-words and short tokens are
 * filtered out — same normalisation used by the global word-frequency
 * aggregate so users see comparable lists across the app.
 */
export function WordsCard({ rec, hoveredWord, onHover }: WordsCardProps): React.JSX.Element {
  const counts = useMemo(() => {
    const map = new Map<string, number>()
    for (const w of tokenise(rec.result)) {
      map.set(w, (map.get(w) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([word, count]) => ({ word, count }))
      .sort((a, b) => b.count - a.count || a.word.localeCompare(b.word))
  }, [rec.result])

  return (
    <Card className="flex min-h-[180px] flex-1 flex-col p-4 text-[12px]">
      <div className="mb-2 text-[12px] font-semibold tracking-tight text-foreground">
        Most common words
      </div>
      {counts.length === 0 ? (
        <div className="text-muted-foreground">No word data.</div>
      ) : (
        <ul className="min-h-0 flex-1 space-y-px overflow-y-auto pr-1">
          {counts.map((c) => {
            const isHovered = hoveredWord === c.word
            return (
              <li key={c.word}>
                <button
                  type="button"
                  onMouseEnter={() => onHover(c.word)}
                  onMouseLeave={() => onHover(null)}
                  onFocus={() => onHover(c.word)}
                  onBlur={() => onHover(null)}
                  className={cn(
                    'flex w-full items-center justify-between rounded px-2 py-1 text-left transition-colors',
                    isHovered
                      ? 'bg-accent-blue-bg text-accent-blue'
                      : 'text-foreground hover:bg-foreground/5'
                  )}
                >
                  <span className="truncate">{c.word}</span>
                  <span
                    className={cn(
                      'tabular-nums',
                      isHovered ? 'text-accent-blue' : 'text-muted-foreground'
                    )}
                  >
                    {c.count}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
