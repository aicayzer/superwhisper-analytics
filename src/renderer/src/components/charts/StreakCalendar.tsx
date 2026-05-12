import type { StreakCell } from '@renderer/lib/types'
import { useMemo } from 'react'

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

/**
 * Recording streak grid — full calendar months rendered as an HTML/CSS
 * grid (matching the When You Record heatmap). Each column = one ISO
 * week (Mon-start), each row = one day of week.
 *
 * Two reasons the grid always shows full calendar months instead of
 * matching the active range pill exactly:
 *
 *   1. Visual stability — flipping between 7d / 30d / 90d / All time
 *      should not reshape the calendar. The grid is "what this slice of
 *      your year looks like"; the range only changes which cells are
 *      shaded as "real" data.
 *   2. Read at a glance — a strip ending mid-month is hard to parse;
 *      a full Aug + Sep + Oct + Nov grid reads as the calendar it is.
 *
 * Cells INSIDE the active range carry the normal muted → chart-1
 * intensity ramp. Cells OUTSIDE render at a dimmer fixed shade so the
 * shape stays constant but the in-range stretch is the one that
 * dominates visually. Range = "All time" means every cell is in-range.
 *
 * Day labels are emitted for every row (Mon..Sun) and month labels use
 * a compact MM/YY format so a 12-month grid doesn't overflow.
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

    // Anchor the grid on the most recent date in the dataset (or today
    // if it's later than any entry — keeps the calendar honest when the
    // range pill moves but the underlying data is stale).
    const lastDate = new Date(data[data.length - 1]!.date)
    const today = new Date()
    const anchor = today.getTime() > lastDate.getTime() ? today : lastDate
    const lastMonth = endOfMonth(anchor)
    // Pick the start month: enough months to cover the requested range
    // but never fewer than MIN_VISIBLE_MONTHS, and never more than 12
    // (which keeps the grid manageable at any window width).
    const requestedFrom = rangeFrom ?? new Date(data[0]!.date)
    const monthsByRange =
      (lastMonth.getFullYear() - requestedFrom.getFullYear()) * 12 +
      (lastMonth.getMonth() - requestedFrom.getMonth()) +
      1
    const monthCount = Math.max(MIN_VISIBLE_MONTHS, Math.min(12, monthsByRange))
    const firstMonth = addMonths(lastMonth, -(monthCount - 1))
    const firstDay = startOfMonth(firstMonth)

    // Build the grid column-by-column (Mon-start weeks). Pad the first
    // week so the first column always has 7 cells but cells before
    // `firstDay` are flagged `padding: true`.
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
    // Flush any partial trailing week with padding cells.
    if (week.length > 0) {
      while (week.length < 7) {
        week.push({ date: '', count: 0, inRange: false, padding: true })
      }
      cols.push(week)
    }

    // Month markers — one per month, positioned at the first column that
    // contains a day of that month. Label format is MM/YY for compact
    // rendering across many months.
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

  if (columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
        No data.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[110px] w-full flex-col gap-1 text-[10px] text-muted-foreground">
      {/* Month label strip — sits above the grid, indexed by column.
          The 22px gutter mirrors the day-label column below. */}
      <div
        className="grid gap-px"
        style={{
          gridTemplateColumns: `22px repeat(${columns.length}, minmax(0, 1fr))`,
          height: 12
        }}
      >
        <div />
        {columns.map((_, col) => {
          const marker = monthMarkers.find((m) => m.col === col)
          return (
            <div key={col} className="text-[9px] leading-none tabular-nums">
              {marker ? marker.label : ''}
            </div>
          )
        })}
      </div>
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
            className="pr-1 text-right text-[9px] leading-none"
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
                title={`${cell.date} — ${cell.count}`}
                className="rounded-[2px]"
                style={{
                  gridColumn: col + 2,
                  gridRow: row + 1,
                  backgroundColor: backgroundFor(cell, max)
                }}
              />
            )
          })
        )}
      </div>
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
  // Faded chart-1 — dimmer than any in-range shaded cell.
  const dim = Math.max(8, Math.round((cell.count / max) * 30))
  return `color-mix(in oklab, var(--chart-1) ${dim}%, color-mix(in oklab, var(--muted) 35%, transparent))`
}
