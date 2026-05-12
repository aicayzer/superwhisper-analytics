import type { StreakCell } from '@renderer/lib/types'
import { useMemo, useState } from 'react'

interface StreakCalendarProps {
  /** One entry per day, ordered oldest → newest. */
  data: StreakCell[]
  /** Optional active-range window. Cells whose date is inside this
   *  window render with full intensity; cells outside render in a
   *  dimmer "out-of-range" shade so the calendar's shape (full months)
   *  stays constant across range changes. */
  rangeFrom?: Date
  rangeTo?: Date
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const

/** Minimum span (in calendar months) shown by the grid. Even at 7d the
 *  user sees the previous and current month edge-to-edge so the grid
 *  isn't a thin sliver. */
const MIN_VISIBLE_MONTHS = 2

interface GridCell {
  /** ISO date string yyyy-MM-dd. */
  date: string
  /** Recording count for that day, or 0 if no entry. */
  count: number
  /** True iff this date falls inside the active range window. */
  inRange: boolean
  /** True iff this date is a "padding" day outside the visible months
   *  used to round the grid up to whole weeks (rendered as empty cells). */
  padding: boolean
}

function ymd(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7
}

function addMonths(d: Date, months: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + months, 1)
}

function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1)
}

function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0)
}

/** Format a yyyy-MM-dd into a long-form "Mon, 5 Mar 2026" for tooltips. */
function formatTooltipDate(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}

/**
 * Recording streak grid — full calendar months rendered as an HTML/CSS
 * grid (matching the When You Record heatmap). Each column = one ISO
 * week (Mon-start), each row = one day of week.
 *
 * The grid always shows full calendar months regardless of the active
 * range. Cells inside the range carry the normal muted → chart-1
 * intensity ramp; cells outside render at a dimmer shade so the shape
 * stays constant but the in-range stretch is the one that dominates.
 *
 * Hovering a cell surfaces a tooltip with the long-form date and the
 * recording count. The month-label strip sits BELOW the grid (matching
 * the Recordings-by-hour heatmap's x-axis convention).
 */
export function StreakCalendar({
  data,
  rangeFrom,
  rangeTo
}: StreakCalendarProps): React.JSX.Element {
  const { columns, monthMarkers, max } = useMemo(() => {
    if (data.length === 0) return { columns: [] as GridCell[][], monthMarkers: [], max: 1 }

    const dataMap = new Map<string, number>(data.map((d) => [d.date, d.count]))
    let m = 0
    for (const v of dataMap.values()) if (v > m) m = v

    const lastDate = new Date(data[data.length - 1]!.date)
    const today = new Date()
    const anchor = today.getTime() > lastDate.getTime() ? today : lastDate
    const lastMonth = endOfMonth(anchor)
    const requestedFrom = rangeFrom ?? new Date(data[0]!.date)
    const monthsByRange =
      (lastMonth.getFullYear() - requestedFrom.getFullYear()) * 12 +
      (lastMonth.getMonth() - requestedFrom.getMonth()) +
      1
    const monthCount = Math.max(MIN_VISIBLE_MONTHS, Math.min(12, monthsByRange))
    const firstMonth = addMonths(lastMonth, -(monthCount - 1))
    const firstDay = startOfMonth(firstMonth)

    const cols: GridCell[][] = []
    let week: GridCell[] = []
    const firstDayIdx = mondayIndex(firstDay)
    for (let i = 0; i < firstDayIdx; i++) {
      week.push({ date: '', count: 0, inRange: false, padding: true })
    }
    const lastDay = endOfMonth(anchor)
    const cur = new Date(firstDay)
    while (cur.getTime() <= lastDay.getTime()) {
      const key = ymd(cur)
      const inRange =
        (!rangeFrom || cur.getTime() >= rangeFrom.getTime()) &&
        (!rangeTo || cur.getTime() <= rangeTo.getTime())
      week.push({
        date: key,
        count: dataMap.get(key) ?? 0,
        inRange,
        padding: false
      })
      if (week.length === 7) {
        cols.push(week)
        week = []
      }
      cur.setDate(cur.getDate() + 1)
    }
    if (week.length > 0) {
      while (week.length < 7) {
        week.push({ date: '', count: 0, inRange: false, padding: true })
      }
      cols.push(week)
    }

    const markers: Array<{ col: number; label: string }> = []
    let lastSeen = -1
    cols.forEach((wk, col) => {
      for (const cell of wk) {
        if (cell.padding) continue
        const d = new Date(cell.date)
        const monthKey = d.getFullYear() * 12 + d.getMonth()
        if (monthKey !== lastSeen) {
          markers.push({
            col,
            label: `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getFullYear() % 100).padStart(2, '0')}`
          })
          lastSeen = monthKey
          break
        }
      }
    })

    return { columns: cols, monthMarkers: markers, max: m || 1 }
  }, [data, rangeFrom, rangeTo])

  // Tooltip state — { date, count } of the cell currently under the
  // pointer, plus the pointer-relative anchor so the floating panel
  // tracks the cursor.
  const [tip, setTip] = useState<{ x: number; y: number; date: string; count: number } | null>(null)

  if (columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
        No data.
      </div>
    )
  }

  return (
    <div
      className="relative flex h-full min-h-[110px] w-full flex-col gap-1 text-[10px] text-muted-foreground"
      onPointerLeave={() => setTip(null)}
    >
      {/* Main grid: day-of-week label column + N week columns. */}
      <div
        className="grid min-h-0 flex-1 gap-px"
        style={{
          gridTemplateColumns: `22px repeat(${columns.length}, minmax(0, 1fr))`,
          gridTemplateRows: 'repeat(7, minmax(0, 1fr))'
        }}
      >
        {DAY_LABELS.map((label, row) => (
          <div
            key={`label-${row}`}
            className="pr-1 text-right text-[10px] leading-none"
            style={{ gridColumn: 1, gridRow: row + 1 }}
          >
            {label}
          </div>
        ))}
        {columns.map((week, col) =>
          week.map((cell, row) => {
            const key = `${col}-${row}`
            if (cell.padding) {
              return <div key={key} style={{ gridColumn: col + 2, gridRow: row + 1 }} aria-hidden />
            }
            return (
              <div
                key={key}
                className="rounded-[2px]"
                style={{
                  gridColumn: col + 2,
                  gridRow: row + 1,
                  backgroundColor: backgroundFor(cell, max)
                }}
                onPointerMove={(e) => {
                  const target = e.currentTarget.parentElement?.parentElement
                  const rect = target?.getBoundingClientRect()
                  if (!rect) return
                  setTip({
                    x: e.clientX - rect.left,
                    y: e.clientY - rect.top,
                    date: cell.date,
                    count: cell.count
                  })
                }}
                onPointerLeave={() => setTip(null)}
              />
            )
          })
        )}
      </div>
      {/* Month label strip — sits BELOW the grid (x-axis convention),
          indexed by column. The 22px gutter mirrors the day-label column. */}
      <div
        className="grid gap-px pt-0.5"
        style={{
          gridTemplateColumns: `22px repeat(${columns.length}, minmax(0, 1fr))`,
          height: 12
        }}
      >
        <div />
        {columns.map((_, col) => {
          const marker = monthMarkers.find((m) => m.col === col)
          return (
            <div key={col} className="text-[10px] leading-none tabular-nums">
              {marker ? marker.label : ''}
            </div>
          )
        })}
      </div>
      {tip && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] text-foreground shadow-[var(--shadow-float)]"
          style={{ left: tip.x, top: tip.y - 6 }}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {formatTooltipDate(tip.date)}
          </div>
          <div className="mt-0.5 tabular-nums">
            {tip.count} recording{tip.count === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Pick a cell's background colour.
 *
 *   • In-range, count > 0 → mix chart-1 with muted by intensity.
 *   • In-range, count = 0 → solid muted.
 *   • Out of range, count > 0 → faint chart-1 tint (much lower mix %)
 *     so the user sees there WAS activity there but the eye still
 *     resolves to the in-range stretch first.
 *   • Out of range, count = 0 → the lightest neutral shade we have
 *     (mostly transparent over the card background).
 */
function backgroundFor(cell: GridCell, max: number): string {
  if (cell.inRange) {
    if (cell.count === 0) return 'var(--muted)'
    const intensity = Math.max(8, Math.round((cell.count / max) * 100))
    return `color-mix(in oklab, var(--chart-1) ${intensity}%, var(--muted))`
  }
  if (cell.count === 0) return 'color-mix(in oklab, var(--muted) 35%, transparent)'
  const dim = Math.max(8, Math.round((cell.count / max) * 30))
  return `color-mix(in oklab, var(--chart-1) ${dim}%, color-mix(in oklab, var(--muted) 35%, transparent))`
}
