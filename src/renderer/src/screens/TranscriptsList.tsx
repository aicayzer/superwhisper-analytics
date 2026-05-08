import { Card } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/cn'
import { formatDurationSec, formatTimestamp, truncate } from '@renderer/lib/format'
import { mock } from '@renderer/lib/mock'
import type { Recording } from '@renderer/lib/types'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

type SortKey = 'datetime' | 'modeName' | 'duration' | 'wordCount' | 'wordsPerMinute'
type Direction = 'asc' | 'desc'

const COLS: Array<{ key: SortKey; label: string; align: 'left' | 'right'; width?: string }> = [
  { key: 'datetime', label: 'When', align: 'left', width: '180px' },
  { key: 'modeName', label: 'Mode', align: 'left', width: '120px' }
  // Snippet column has no sort; left blank in COLS
]

const NUMERIC_COLS: Array<{ key: SortKey; label: string }> = [
  { key: 'duration', label: 'Duration' },
  { key: 'wordCount', label: 'Words' },
  { key: 'wordsPerMinute', label: 'WPM' }
]

function sortRecordings(records: Recording[], key: SortKey, dir: Direction): Recording[] {
  const factor = dir === 'asc' ? 1 : -1
  const sorted = [...records].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (typeof av === 'string' && typeof bv === 'string') return av.localeCompare(bv) * factor
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * factor
    return 0
  })
  return sorted
}

export function TranscriptsList(): React.JSX.Element {
  const [sortKey, setSortKey] = useState<SortKey>('datetime')
  const [dir, setDir] = useState<Direction>('desc')

  const rows = useMemo(() => sortRecordings(mock.recordings, sortKey, dir), [sortKey, dir])

  const toggle = (key: SortKey): void => {
    if (key === sortKey) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setDir(key === 'datetime' ? 'desc' : 'asc')
    }
  }

  return (
    <div className="py-3">
      <Card className="overflow-hidden p-0">
        <div className="max-h-[calc(100vh-128px)] overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                {COLS.map((c) => (
                  <SortHeader
                    key={c.key}
                    label={c.label}
                    active={sortKey === c.key}
                    direction={dir}
                    onClick={() => toggle(c.key)}
                    align={c.align}
                    width={c.width}
                  />
                ))}
                <th className="border-b border-border px-4 py-2.5 font-medium">Snippet</th>
                {NUMERIC_COLS.map((c) => (
                  <SortHeader
                    key={c.key}
                    label={c.label}
                    active={sortKey === c.key}
                    direction={dir}
                    onClick={() => toggle(c.key)}
                    align="right"
                    width="100px"
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-10 text-center text-[13px] text-muted-foreground"
                  >
                    No transcripts match.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="border-t border-border/60 transition-colors hover:bg-foreground/[0.02]"
                  >
                    <td className="px-4 py-2 align-middle tabular-nums text-muted-foreground whitespace-nowrap">
                      <Link to={`/transcripts/${r.id}`} className="hover:text-foreground">
                        {formatTimestamp(r.datetime)}
                      </Link>
                    </td>
                    <td className="px-4 py-2 align-middle">
                      <span className="inline-flex items-center rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
                        {r.modeName}
                      </span>
                    </td>
                    <td className="max-w-0 truncate px-4 py-2 align-middle text-foreground">
                      <Link to={`/transcripts/${r.id}`} className="hover:underline">
                        {truncate(r.excerpt, 140)}
                      </Link>
                    </td>
                    <td className="px-4 py-2 text-right align-middle tabular-nums text-muted-foreground">
                      {formatDurationSec(r.duration / 1000)}
                    </td>
                    <td className="px-4 py-2 text-right align-middle tabular-nums text-muted-foreground">
                      {r.wordCount.toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-right align-middle tabular-nums text-muted-foreground">
                      {r.wordsPerMinute}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

interface SortHeaderProps {
  label: string
  active: boolean
  direction: Direction
  onClick: () => void
  align: 'left' | 'right'
  width?: string
}

function SortHeader({
  label,
  active,
  direction,
  onClick,
  align,
  width
}: SortHeaderProps): React.JSX.Element {
  return (
    <th
      className="border-b border-border px-4 py-2.5 font-medium"
      style={{ width, textAlign: align }}
    >
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'inline-flex items-center gap-1 rounded transition-colors hover:text-foreground',
          active && 'text-foreground',
          align === 'right' && 'flex-row-reverse'
        )}
      >
        {label}
        {active &&
          (direction === 'asc' ? (
            <ChevronUp className="h-3 w-3" strokeWidth={2} />
          ) : (
            <ChevronDown className="h-3 w-3" strokeWidth={2} />
          ))}
      </button>
    </th>
  )
}
