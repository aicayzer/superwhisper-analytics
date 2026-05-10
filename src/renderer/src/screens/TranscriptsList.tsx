import { Card } from '@renderer/components/ui/card'
import { IconButton } from '@renderer/components/ui/IconButton'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { cn } from '@renderer/lib/cn'
import { formatDurationSec, formatTimestamp, truncate } from '@renderer/lib/format'
import type { Recording } from '@renderer/lib/types'
import { useDataStore } from '@renderer/state/dataStore'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Columns3 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

type SortKey = 'datetime' | 'modeName' | 'duration' | 'wordCount' | 'wordsPerMinute'
type Direction = 'asc' | 'desc'

type ColKey = SortKey | 'snippet'

interface ColSpec {
  key: ColKey
  label: string
  align: 'left' | 'right'
  /** Snippet column flexes to fill remaining space; the rest are fixed. */
  width?: string
  /** Whether the column header is clickable to sort. Snippet has no
   *  natural ordering so it isn't sortable. */
  sortKey?: SortKey
  defaultVisible: boolean
}

const COLS: ColSpec[] = [
  {
    key: 'datetime',
    label: 'When',
    align: 'left',
    width: '180px',
    sortKey: 'datetime',
    defaultVisible: true
  },
  {
    key: 'modeName',
    label: 'Mode',
    align: 'left',
    width: '120px',
    sortKey: 'modeName',
    defaultVisible: true
  },
  {
    key: 'duration',
    label: 'Duration',
    align: 'right',
    width: '100px',
    sortKey: 'duration',
    defaultVisible: true
  },
  {
    key: 'wordCount',
    label: 'Words',
    align: 'right',
    width: '90px',
    sortKey: 'wordCount',
    defaultVisible: true
  },
  {
    key: 'wordsPerMinute',
    label: 'WPM',
    align: 'right',
    width: '80px',
    sortKey: 'wordsPerMinute',
    defaultVisible: true
  },
  { key: 'snippet', label: 'Snippet', align: 'left', defaultVisible: true }
]

const PAGE_SIZE = 25
const STORAGE_KEY = 'transcripts.columns'

function loadVisibility(): Record<ColKey, boolean> {
  const defaults = Object.fromEntries(COLS.map((c) => [c.key, c.defaultVisible])) as Record<
    ColKey,
    boolean
  >
  if (typeof window === 'undefined') return defaults
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw) as Record<string, boolean>
    // Merge so newly-introduced columns inherit their default rather than
    // being silently hidden if they weren't in storage.
    return { ...defaults, ...parsed }
  } catch {
    return defaults
  }
}

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
  const recordings = useDataStore((s) => s.recordings)
  const [sortKey, setSortKey] = useState<SortKey>('datetime')
  const [dir, setDir] = useState<Direction>('desc')
  const [page, setPage] = useState(1)
  const [visibility, setVisibility] = useState<Record<ColKey, boolean>>(() => loadVisibility())
  const navigate = useNavigate()

  // Persist column visibility across reloads. Pagination + sort intentionally
  // reset on each load — fresher signals than column choice.
  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(visibility))
    } catch {
      /* localStorage unavailable; in-memory state still works */
    }
  }, [visibility])

  const visibleCols = useMemo(() => COLS.filter((c) => visibility[c.key]), [visibility])

  const sortedRows = useMemo(
    () => sortRecordings(recordings, sortKey, dir),
    [recordings, sortKey, dir]
  )

  const pageCount = Math.max(1, Math.ceil(sortedRows.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const pageRows = useMemo(
    () => sortedRows.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE),
    [sortedRows, safePage]
  )

  const toggleSort = (key: SortKey): void => {
    if (key === sortKey) {
      setDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setDir(key === 'datetime' ? 'desc' : 'asc')
    }
    // Sort change resets to page 1 — top of the new ordering.
    setPage(1)
  }

  const toggleColumn = (key: ColKey): void => {
    setVisibility((v) => {
      const next = { ...v, [key]: !v[key] }
      // Don't allow zero columns; revert if the user un-checked the last one.
      if (!Object.values(next).some(Boolean)) return v
      return next
    })
  }

  return (
    <div className="flex h-full flex-col">
      <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
        {/* Toolbar sits above the table, flush with the card edge. Hosts the
            column-visibility menu (previously lived in the navbar). */}
        <div className="flex items-center justify-end border-b border-border px-4 py-1.5">
          <ColumnsMenu visibility={visibility} onToggle={toggleColumn} />
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto">
          <table className="w-full text-[13px]">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="text-[12px] font-medium text-foreground">
                {visibleCols.map((c) => (
                  <SortHeader
                    key={c.key}
                    col={c}
                    active={c.sortKey === sortKey}
                    direction={dir}
                    onClick={c.sortKey ? () => toggleSort(c.sortKey!) : undefined}
                  />
                ))}
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={visibleCols.length}
                    className="px-4 py-10 text-center text-[13px] text-muted-foreground"
                  >
                    No transcripts match.
                  </td>
                </tr>
              ) : (
                pageRows.map((r) => (
                  <tr
                    key={r.id}
                    onClick={() => navigate(`/transcripts/${r.id}`)}
                    className="cursor-pointer border-t border-border/60 transition-colors hover:bg-foreground/[0.03]"
                  >
                    {visibleCols.map((c) => (
                      <RowCell key={c.key} col={c} rec={r} />
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <Pagination
          page={safePage}
          pageCount={pageCount}
          total={sortedRows.length}
          onChange={setPage}
        />
      </Card>
    </div>
  )
}

function RowCell({ col, rec }: { col: ColSpec; rec: Recording }): React.JSX.Element {
  switch (col.key) {
    case 'datetime':
      return (
        <td className="whitespace-nowrap px-4 py-2 align-middle tabular-nums text-foreground">
          <Link
            to={`/transcripts/${rec.id}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
          >
            {formatTimestamp(rec.datetime)}
          </Link>
        </td>
      )
    case 'modeName':
      return (
        <td className="px-4 py-2 align-middle">
          <span className="inline-flex items-center rounded-md border border-border bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-secondary-foreground">
            {rec.modeName}
          </span>
        </td>
      )
    case 'duration':
      return (
        <td className="px-4 py-2 text-right align-middle tabular-nums text-muted-foreground">
          {formatDurationSec(rec.duration / 1000)}
        </td>
      )
    case 'wordCount':
      return (
        <td className="px-4 py-2 text-right align-middle tabular-nums text-muted-foreground">
          {rec.wordCount.toLocaleString()}
        </td>
      )
    case 'wordsPerMinute':
      return (
        <td className="px-4 py-2 text-right align-middle tabular-nums text-muted-foreground">
          {rec.wordsPerMinute}
        </td>
      )
    case 'snippet':
      // max-w-0 lets the column flex naturally while still letting truncate
      // kick in for ellipsis overflow.
      return (
        <td className="max-w-0 px-4 py-2 align-middle text-muted-foreground">
          <span className="block truncate">{truncate(rec.excerpt, 140)}</span>
        </td>
      )
  }
}

interface SortHeaderProps {
  col: ColSpec
  active: boolean
  direction: Direction
  onClick?: () => void
}

function SortHeader({ col, active, direction, onClick }: SortHeaderProps): React.JSX.Element {
  const sortable = Boolean(onClick)
  return (
    <th
      className="border-b border-border px-4 py-2.5 font-medium"
      style={{ width: col.width, textAlign: col.align }}
    >
      {sortable ? (
        <button
          type="button"
          onClick={onClick}
          className={cn(
            'inline-flex items-center gap-1 rounded transition-colors hover:text-foreground',
            active && 'text-foreground',
            col.align === 'right' && 'flex-row-reverse'
          )}
        >
          {col.label}
          {active &&
            (direction === 'asc' ? (
              <ChevronUp className="h-3 w-3" strokeWidth={2} />
            ) : (
              <ChevronDown className="h-3 w-3" strokeWidth={2} />
            ))}
        </button>
      ) : (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-muted-foreground',
            col.align === 'right' && 'flex-row-reverse'
          )}
        >
          {col.label}
        </span>
      )}
    </th>
  )
}

interface PaginationProps {
  page: number
  pageCount: number
  total: number
  onChange: (page: number) => void
}

/**
 * Footer row that mirrors the table head — sticky inside the card so it
 * always sits below the table. Prev/Next IconButtons flank a list of page
 * numbers with ellipsis collapse for ≥8 pages.
 */
function Pagination({ page, pageCount, total, onChange }: PaginationProps): React.JSX.Element {
  const goto = (p: number): void => onChange(Math.max(1, Math.min(pageCount, p)))
  const pages = pageNumbers(page, pageCount)

  return (
    <div className="flex items-center justify-between gap-3 border-t border-border bg-card px-4 py-1.5 text-[12px] text-muted-foreground">
      <span className="tabular-nums">
        {total === 0 ? '0 recordings' : `${total.toLocaleString()} recordings`}
      </span>
      <div className="flex items-center gap-0">
        <IconButton
          onClick={() => goto(page - 1)}
          disabled={page <= 1}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
        </IconButton>
        {pages.map((p, i) =>
          p === '…' ? (
            <span
              key={`ellipsis-${i}`}
              aria-hidden
              className="inline-flex h-7 w-7 items-center justify-center text-muted-foreground"
            >
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => goto(p)}
              aria-current={p === page ? 'page' : undefined}
              aria-label={`Page ${p}`}
              className={cn(
                'inline-flex h-7 min-w-[1.5rem] items-center justify-center rounded-md px-1 text-[12px] tabular-nums transition-colors',
                p === page
                  ? 'bg-foreground/[0.06] text-foreground'
                  : 'text-muted-foreground hover:bg-foreground/5 hover:text-foreground'
              )}
            >
              {p}
            </button>
          )
        )}
        <IconButton
          onClick={() => goto(page + 1)}
          disabled={page >= pageCount}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight className="h-3.5 w-3.5" strokeWidth={1.8} />
        </IconButton>
      </div>
    </div>
  )
}

/**
 * Compresses the page list when there are more than 7 pages: always shows
 * 1, current ± 1, and last; everything else collapses to "…".
 *
 *   1 … 4 5 6 … 12   (current = 5, 12 pages)
 */
function pageNumbers(current: number, total: number): Array<number | '…'> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  const out: Array<number | '…'> = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) out.push('…')
  for (let i = start; i <= end; i++) out.push(i)
  if (end < total - 1) out.push('…')
  out.push(total)
  return out
}

function ColumnsMenu({
  visibility,
  onToggle
}: {
  visibility: Record<ColKey, boolean>
  onToggle: (key: ColKey) => void
}): React.JSX.Element {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <IconButton aria-label="Configure columns" title="Configure columns">
          <Columns3 className="h-3.5 w-3.5" strokeWidth={1.8} />
        </IconButton>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-1 text-[12.5px]">
        <div className="px-2 pb-1.5 pt-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          Columns
        </div>
        {COLS.map((c) => (
          <label
            key={c.key}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            <input
              type="checkbox"
              checked={visibility[c.key]}
              onChange={() => onToggle(c.key)}
              className="h-3.5 w-3.5 accent-foreground"
            />
            <span>{c.label}</span>
          </label>
        ))}
      </PopoverContent>
    </Popover>
  )
}
