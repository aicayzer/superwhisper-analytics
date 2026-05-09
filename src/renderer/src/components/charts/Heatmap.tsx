import { useMemo } from 'react'

interface HeatmapProps {
  /** 7×24 matrix — rows are days (0=Mon), cols are hours. */
  matrix: number[][]
  /** Day labels in the same order as rows. */
  dayLabels?: readonly string[]
  /** Cell height in px. */
  cellHeight?: number
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
  compact = false
}: HeatmapProps): React.JSX.Element {
  const max = useMemo(() => {
    let m = 0
    for (const row of matrix) for (const v of row) if (v > m) m = v
    return m || 1
  }, [matrix])

  const labelCol = compact ? '0' : '32px'

  return (
    <div className="text-[10px] text-muted-foreground">
      <div className="grid gap-px" style={{ gridTemplateColumns: `${labelCol} repeat(24, 1fr)` }}>
        {matrix.map((row, dayIdx) => (
          <RowFragment
            key={dayIdx}
            day={compact ? '' : (dayLabels[dayIdx] ?? '')}
            row={row}
            max={max}
            cellHeight={cellHeight}
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
  cellHeight: number
  showLabel: boolean
}): React.JSX.Element {
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
          style={{
            height: cellHeight,
            backgroundColor:
              v === 0
                ? 'var(--muted)'
                : `color-mix(in oklab, var(--chart-1) ${Math.round((v / max) * 100)}%, var(--muted))`
          }}
        />
      ))}
    </>
  )
}
