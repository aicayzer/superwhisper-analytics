import type { StreakCell } from '@renderer/lib/types'
import { useMemo } from 'react'

interface StreakCalendarProps {
  /** One entry per day, ordered oldest → newest. */
  data: StreakCell[]
  /** Side length of each cell in px (default 11, GitHub-style). */
  cellSize?: number
  /** Gap between cells. */
  cellGap?: number
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
 * GitHub-style streak grid — 53 weeks × 7 days. Mon-start.
 * Renders as plain SVG so columns and labels stay perfectly aligned no
 * matter the parent width. Cell colour ramps from --muted (zero) toward
 * --chart-1 by relative intensity, via color-mix, so the gradient adapts
 * to dark mode.
 */
export function StreakCalendar({
  data,
  cellSize = 11,
  cellGap = 2
}: StreakCalendarProps): React.JSX.Element {
  // Compute layout: turn the flat list into [week][weekday] columns.
  // Mon-start: shift JS day so 1=Mon, 2=Tue, ..., 7=Sun mapped to 0..6.
  const { columns, monthMarkers, max } = useMemo(() => {
    const columns: Array<Array<StreakCell | null>> = []
    let m = 0
    if (data.length === 0) return { columns, monthMarkers: [], max: 1 }

    const firstDate = new Date(data[0]!.date)
    const firstDayIdx = (firstDate.getDay() + 6) % 7 // 0=Mon
    let week: Array<StreakCell | null> = Array(firstDayIdx).fill(null)

    let lastMonth = -1
    const markers: Array<{ col: number; label: string }> = []

    for (const cell of data) {
      const d = new Date(cell.date)
      const month = d.getMonth()
      if (month !== lastMonth && week.length === 0) {
        markers.push({ col: columns.length, label: MONTH_LABELS[month]! })
        lastMonth = month
      }
      week.push(cell)
      if (cell.count > m) m = cell.count
      if (week.length === 7) {
        columns.push(week)
        week = []
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null)
      columns.push(week)
    }
    return { columns, monthMarkers: markers, max: m || 1 }
  }, [data])

  const stride = cellSize + cellGap
  const labelGutter = 22
  const monthRowH = 12
  const width = labelGutter + columns.length * stride
  const height = monthRowH + 7 * stride

  return (
    <svg
      role="img"
      aria-label="Recording streak calendar"
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full"
    >
      {/* Day labels (left column) */}
      {DAY_LABELS.map((label, i) =>
        label ? (
          <text
            key={i}
            x={0}
            y={monthRowH + i * stride + cellSize - 1}
            fontSize={9}
            fill="var(--muted-foreground)"
          >
            {label}
          </text>
        ) : null
      )}
      {/* Month labels (top row) */}
      {monthMarkers.map((m, i) => (
        <text
          key={i}
          x={labelGutter + m.col * stride}
          y={9}
          fontSize={9}
          fill="var(--muted-foreground)"
        >
          {m.label}
        </text>
      ))}
      {/* Cells */}
      {columns.map((week, c) =>
        week.map((cell, r) => {
          const x = labelGutter + c * stride
          const y = monthRowH + r * stride
          if (!cell) {
            return (
              <rect
                key={`${c}-${r}`}
                x={x}
                y={y}
                width={cellSize}
                height={cellSize}
                fill="transparent"
              />
            )
          }
          const intensity = cell.count === 0 ? 0 : Math.max(8, Math.round((cell.count / max) * 100))
          const fill =
            cell.count === 0
              ? 'var(--muted)'
              : `color-mix(in oklab, var(--chart-1) ${intensity}%, var(--muted))`
          return (
            <rect
              key={`${c}-${r}`}
              x={x}
              y={y}
              width={cellSize}
              height={cellSize}
              rx={2}
              ry={2}
              fill={fill}
            >
              <title>{`${cell.date} — ${cell.count}`}</title>
            </rect>
          )
        })
      )}
    </svg>
  )
}
