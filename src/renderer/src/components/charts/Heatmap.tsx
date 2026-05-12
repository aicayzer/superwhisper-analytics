import { useMemo } from 'react'

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

/**
 * Hand-rolled day × hour heatmap. CSS grid; one div per cell.
 *
 * Cell colour ramps from `--muted` (empty) to `--chart-1` by relative
 * intensity (max value in the matrix), via `color-mix`. Because both
 * tokens flip with theme, the ramp stays readable in dark mode.
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

  return (
    <div
      className={
        stretch
          ? 'flex h-full min-h-[110px] w-full flex-col text-[10px] text-muted-foreground'
          : 'min-h-[110px] w-full text-[10px] text-muted-foreground'
      }
    >
      <div
        className={stretch ? 'grid min-h-0 w-full flex-1 gap-px' : 'grid w-full gap-px'}
        style={gridStyle}
      >
        {matrix.map((row, dayIdx) => (
          <RowFragment
            key={dayIdx}
            day={compact ? '' : (dayLabels[dayIdx] ?? '')}
            row={row}
            max={max}
            cellHeight={stretch ? undefined : cellHeight}
            showLabel={!compact}
          />
        ))}
        {/* Hour axis */}
        {!compact && <div />}
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="pt-1 text-center">
            {HOUR_TICKS.includes(h) ? h : ''}
          </div>
        ))}
      </div>
    </div>
  )
}

function RowFragment({
  day,
  row,
  max,
  cellHeight,
  showLabel
}: {
  day: string
  row: number[]
  max: number
  cellHeight: number | undefined
  showLabel: boolean
}): React.JSX.Element {
  // When cellHeight is undefined the row stretches via the parent grid
  // template (the stretch path); otherwise we pin each cell to a fixed
  // pixel height (the legacy compact-embed path).
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
        <div className="flex items-center pr-2 text-right text-muted-foreground">{day}</div>
      )}
      {row.map((v, h) => (
        <div
          key={h}
          title={`${day} ${h}:00 — ${v}`}
          className="rounded-[2px]"
          style={cellStyle(v)}
        />
      ))}
    </>
  )
}
