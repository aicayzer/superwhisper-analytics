import type { StreakCell } from '@renderer/lib/types'
import { useEffect, useMemo, useRef, useState } from 'react'

interface StreakCalendarProps {
  /** One entry per day, ordered oldest → newest. */
  data: StreakCell[]
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
const LABEL_GUTTER = 22
const MONTH_ROW_H = 12
const MIN_CELL = 5
const MAX_CELL = 16

/**
 * GitHub-style streak grid — up to 53 weeks × 7 days, Mon-start.
 *
 * Cell size adapts to the container via ResizeObserver — the grid stays
 * proportional to whatever cell it's dropped into. A narrow card gives
 * small cells; a wide card gives chunky ones. Capped at [MIN_CELL,
 * MAX_CELL] so cells never disappear or look comical.
 */
export function StreakCalendar({ data, cellGap = 2 }: StreakCalendarProps): React.JSX.Element {
  // Compute layout once per data change. Columns + month markers stay
  // stable across resize ticks — only the visual cellSize changes.
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

  // Pick the natural cellSize that fits both dimensions of the container
  // at this exact data length, then clamp to [MIN_CELL, MAX_CELL]. When the
  // container is too narrow to hold even MIN_CELL × cols, the SVG's
  // preserveAspectRatio downscales the natural viewBox to fit — preferred
  // over overflowing into the neighbouring chart.
  const wrapRef = useRef<HTMLDivElement>(null)
  const [cellSize, setCellSize] = useState<number>(11)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return undefined
    const compute = (): void => {
      const w = el.clientWidth
      const h = el.clientHeight
      if (w <= 0 || h <= 0 || columns.length === 0) return
      const colCount = columns.length
      const byW = (w - LABEL_GUTTER) / colCount - cellGap
      const byH = (h - MONTH_ROW_H) / 7 - cellGap
      const natural = Math.floor(Math.min(byW, byH))
      const next = Math.max(MIN_CELL, Math.min(MAX_CELL, natural))
      setCellSize(next)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [columns.length, cellGap])

  const stride = cellSize + cellGap
  const width = LABEL_GUTTER + columns.length * stride
  const height = MONTH_ROW_H + 7 * stride

  return (
    <div ref={wrapRef} className="h-full min-h-[110px] w-full">
      <svg
        role="img"
        aria-label="Recording streak calendar"
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Day labels (left column) */}
        {DAY_LABELS.map((label, i) =>
          label ? (
            <text
              key={i}
              x={0}
              y={MONTH_ROW_H + i * stride + cellSize - 1}
              fontSize={9}
              fill="var(--muted-foreground)"
            >
              {label}
            </text>
          ) : null
        )}
        {/* Month labels (top row) */}
        {monthMarkers.map((mm, i) => (
          <text
            key={i}
            x={LABEL_GUTTER + mm.col * stride}
            y={9}
            fontSize={9}
            fill="var(--muted-foreground)"
          >
            {mm.label}
          </text>
        ))}
        {/* Cells */}
        {columns.map((week, c) =>
          week.map((cell, r) => {
            const x = LABEL_GUTTER + c * stride
            const y = MONTH_ROW_H + r * stride
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
            const intensity =
              cell.count === 0 ? 0 : Math.max(8, Math.round((cell.count / max) * 100))
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
    </div>
  )
}
