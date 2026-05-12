import { useMemo, useState } from 'react'

interface HeatmapProps {
  /** 7×24 matrix — rows are days (0=Mon), cols are hours. */
  matrix: number[][]
  /** Day labels in the same order as rows. */
  dayLabels?: readonly string[]
  /** Cell height in px when `stretch === false`. Ignored when stretching
   *  (rows distribute the container height instead). Default 14. */
  cellHeight?: number
  /** When true (the default for full-card embeds), rows stretch to fill
   *  the container's height via grid-template-rows = 1fr; the cellHeight
   *  prop is ignored. When false, every row is fixed at `cellHeight` px
   *  — handy for compact embeds where the grid shouldn't dominate. */
  stretch?: boolean
  /** Hide left day-name column (for compact embeds). */
  compact?: boolean
}

const DEFAULT_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'] as const
const HOUR_TICKS = [0, 6, 12, 18]

/** Format an hour-of-day (0-23) into a 12-hour string with am/pm. */
function formatHour(h: number): string {
  const am = h < 12
  const hh = ((h + 11) % 12) + 1
  return `${hh}${am ? 'am' : 'pm'}`
}

/**
 * Hand-rolled day × hour heatmap. CSS grid; one div per cell.
 *
 * Cell colour ramps from `--muted` (empty) to `--chart-1` by relative
 * intensity (max value in the matrix), via `color-mix`. Because both
 * tokens flip with theme, the ramp stays readable in dark mode.
 *
 * Hovering a cell surfaces a floating tooltip with the day, hour, and
 * recording count — the native `title` attribute that this replaces
 * was slow and visually inconsistent with the rest of the app.
 */
export function Heatmap({
  matrix,
  dayLabels = DEFAULT_DAYS,
  cellHeight = 14,
  stretch = true,
  compact = false
}: HeatmapProps): React.JSX.Element {
  const max = useMemo(() => {
    let m = 0
    for (const row of matrix) for (const v of row) if (v > m) m = v
    return m || 1
  }, [matrix])

  const labelCol = compact ? '0' : '32px'

  // When stretching, the 7 day-rows share the remaining height as 1fr
  // each; the hour-axis row stays auto-sized. Otherwise rows are fixed
  // to cellHeight (legacy fixed-cell mode used by compact embeds).
  const gridStyle: React.CSSProperties = stretch
    ? {
        gridTemplateColumns: `${labelCol} repeat(24, minmax(0, 1fr))`,
        gridTemplateRows: 'repeat(7, minmax(0, 1fr)) auto'
      }
    : { gridTemplateColumns: `${labelCol} repeat(24, minmax(0, 1fr))` }

  // Tooltip — { day, hour, count } of the hovered cell + a pointer-
  // relative anchor for the floating panel.
  const [tip, setTip] = useState<{
    x: number
    y: number
    day: string
    hour: number
    count: number
  } | null>(null)

  return (
    <div
      className={
        stretch
          ? 'relative flex h-full min-h-[110px] w-full flex-col text-[10px] text-muted-foreground'
          : 'relative min-h-[110px] w-full text-[10px] text-muted-foreground'
      }
      onPointerLeave={() => setTip(null)}
    >
      <div
        className={stretch ? 'grid min-h-0 w-full flex-1 gap-px' : 'grid w-full gap-px'}
        style={gridStyle}
      >
        {matrix.map((row, dayIdx) => {
          const day = compact ? '' : (dayLabels[dayIdx] ?? '')
          return (
            <Row
              key={dayIdx}
              day={day}
              row={row}
              max={max}
              cellHeight={stretch ? undefined : cellHeight}
              showLabel={!compact}
              onHover={(hour, count, e) => {
                const rect = e.currentTarget.parentElement?.parentElement?.getBoundingClientRect()
                if (!rect) return
                setTip({
                  x: e.clientX - rect.left,
                  y: e.clientY - rect.top,
                  day,
                  hour,
                  count
                })
              }}
              onLeave={() => setTip(null)}
            />
          )
        })}
        {/* Hour axis */}
        {!compact && <div />}
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="pt-1 text-center text-[10px]">
            {HOUR_TICKS.includes(h) ? h : ''}
          </div>
        ))}
      </div>
      {tip && (
        <div
          aria-hidden
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] text-foreground shadow-[var(--shadow-float)]"
          style={{ left: tip.x, top: tip.y - 6 }}
        >
          <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {tip.day} · {formatHour(tip.hour)}
          </div>
          <div className="mt-0.5 tabular-nums">
            {tip.count} recording{tip.count === 1 ? '' : 's'}
          </div>
        </div>
      )}
    </div>
  )
}

interface RowProps {
  day: string
  row: number[]
  max: number
  cellHeight: number | undefined
  showLabel: boolean
  onHover: (hour: number, count: number, e: React.PointerEvent<HTMLDivElement>) => void
  onLeave: () => void
}

function Row({
  day,
  row,
  max,
  cellHeight,
  showLabel,
  onHover,
  onLeave
}: RowProps): React.JSX.Element {
  const cellStyle = (v: number): React.CSSProperties => ({
    ...(cellHeight !== undefined ? { height: cellHeight } : null),
    backgroundColor:
      v === 0
        ? 'var(--muted)'
        : `color-mix(in oklab, var(--chart-1) ${Math.round((v / max) * 100)}%, var(--muted))`
  })
  return (
    <>
      {showLabel && (
        <div className="flex items-center pr-2 text-right text-[10px] text-muted-foreground">
          {day}
        </div>
      )}
      {row.map((v, h) => (
        <div
          key={h}
          className="rounded-[2px]"
          style={cellStyle(v)}
          onPointerMove={(e) => onHover(h, v, e)}
          onPointerLeave={onLeave}
        />
      ))}
    </>
  )
}
