import type { StreakCell } from '@renderer/lib/types'
import { useMemo } from 'react'

interface StreakCalendarProps {
  /** One entry per day, ordered oldest → newest. */
  data: StreakCell[]
}

const DAY_LABELS = ['Mon', '', 'Wed', '', 'Fri', '', ''] as const
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
] as const

/**
 * Recording streak grid — up to 53 weeks × 7 days, Mon-start.
 *
 * Rendered as an HTML/CSS grid (matching the When You Record heatmap)
 * rather than SVG. Each column = one ISO week; each row = one day of
 * week. Columns are `minmax(0, 1fr)` so they expand to fill the
 * container; rows are fixed-fraction rows so they distribute the
 * available height evenly. Labels sit at fixed CSS font-size and never
 * scale with the grid — the SVG implementation that this replaces
 * scaled labels alongside cells, which read as inconsistent against
 * the neighbouring HTML-grid heatmap.
 *
 * The grid takes whatever shape the container hands it: tall and narrow
 * cards give tall narrow cells, wide cards give wide cells. No square
 * lock-in, matching the heatmap's behaviour.
 */
export function StreakCalendar({ data }: StreakCalendarProps): React.JSX.Element {
  // Bucket cells into ISO-week columns (Mon-start). Pre-padding the first
  // week with nulls keeps every column exactly 7 rows tall and keeps
  // day-of-week alignment intact across the grid.
  const { columns, monthMarkers, max } = useMemo(() => {
    const cols: Array<Array<StreakCell | null>> = []
    let m = 0
    if (data.length === 0) return { columns: cols, monthMarkers: [], max: 1 }

    const firstDate = new Date(data[0]!.date)
    const firstDayIdx = (firstDate.getDay() + 6) % 7 // 0=Mon
    let week: Array<StreakCell | null> = Array(firstDayIdx).fill(null)

    let lastMonth = -1
    const markers: Array<{ col: number; label: string }> = []

    for (const cell of data) {
      const d = new Date(cell.date)
      const month = d.getMonth()
      if (month !== lastMonth && week.length === 0) {
        markers.push({ col: cols.length, label: MONTH_LABELS[month]! })
        lastMonth = month
      }
      week.push(cell)
      if (cell.count > m) m = cell.count
      if (week.length === 7) {
        cols.push(week)
        week = []
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null)
      cols.push(week)
    }
    return { columns: cols, monthMarkers: markers, max: m || 1 }
  }, [data])

  if (columns.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground">
        No data.
      </div>
    )
  }

  return (
    <div className="flex h-full min-h-[110px] w-full flex-col gap-1 text-[10px] text-muted-foreground">
      {/* Month label strip — sits above the grid, indexed by column. The
          gutter on the left mirrors the day-label column below so the
          two grids line up flush. */}
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
            <div key={col} className="text-[9px] leading-none">
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
            if (!cell) {
              return <div key={key} style={{ gridColumn: col + 2, gridRow: row + 1 }} aria-hidden />
            }
            const intensity =
              cell.count === 0 ? 0 : Math.max(8, Math.round((cell.count / max) * 100))
            const background =
              cell.count === 0
                ? 'var(--muted)'
                : `color-mix(in oklab, var(--chart-1) ${intensity}%, var(--muted))`
            return (
              <div
                key={key}
                title={`${cell.date} — ${cell.count}`}
                className="rounded-[2px]"
                style={{
                  gridColumn: col + 2,
                  gridRow: row + 1,
                  backgroundColor: background
                }}
              />
            )
          })
        )}
      </div>
    </div>
  )
}
