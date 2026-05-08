import { useMemo } from 'react'

interface HeatmapProps {
  /** 7×24 matrix — rows are days (0=Sun), cols are hours. */
  matrix: number[][]
  /** Day labels in the same order as rows. */
  dayLabels?: readonly string[]
  /** Cell height in px. */
  cellHeight?: number
}

const DEFAULT_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const
const HOUR_TICKS = [0, 6, 12, 18]

/**
 * Hand-rolled day × hour heatmap. CSS grid; one div per cell.
 *
 * Cell colour ramps from the muted background to chart-1 by relative
 * intensity (max value in the matrix). Recharts has no first-class
 * heatmap and the visual we want is a plain grid, so we render directly.
 */
export function Heatmap({
  matrix,
  dayLabels = DEFAULT_DAYS,
  cellHeight = 14
}: HeatmapProps): React.JSX.Element {
  const max = useMemo(() => {
    let m = 0
    for (const row of matrix) for (const v of row) if (v > m) m = v
    return m || 1
  }, [matrix])

  return (
    <div className="text-[10px] text-muted-foreground">
      <div className="grid gap-px" style={{ gridTemplateColumns: '32px repeat(24, 1fr)' }}>
        {matrix.map((row, dayIdx) => (
          <RowFragment
            key={dayIdx}
            day={dayLabels[dayIdx] ?? ''}
            row={row}
            max={max}
            cellHeight={cellHeight}
          />
        ))}
        {/* Hour axis */}
        <div />
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
  cellHeight
}: {
  day: string
  row: number[]
  max: number
  cellHeight: number
}): React.JSX.Element {
  return (
    <>
      <div className="flex items-center pr-2 text-right text-muted-foreground">{day}</div>
      {row.map((v, h) => (
        <div
          key={h}
          title={`${day} ${h}:00 — ${v}`}
          className="rounded-[2px]"
          style={{
            height: cellHeight,
            backgroundColor: v === 0 ? 'var(--muted)' : `hsl(0 0% ${90 - (v / max) * 80}%)`
          }}
        />
      ))}
    </>
  )
}
