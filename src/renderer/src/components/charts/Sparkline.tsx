interface SparklineProps {
  values: number[]
  width?: number
  height?: number
  /** Stroke width — keep it crisp at small sizes. */
  strokeWidth?: number
  /** Render a soft area fill underneath. */
  filled?: boolean
}

/**
 * Tiny inline trend line — designed to live alongside a KPI value.
 * Hand-rolled SVG (Recharts is overkill at 60×16). Constant aspect ratio:
 * pass `width` and `height` literally — no responsive container.
 */
export function Sparkline({
  values,
  width = 64,
  height = 18,
  strokeWidth = 1.25,
  filled = true
}: SparklineProps): React.JSX.Element | null {
  if (values.length < 2) return null

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const stepX = width / (values.length - 1)

  const pts = values.map((v, i) => {
    const x = i * stepX
    const y = height - ((v - min) / range) * (height - 2) - 1
    return [x, y] as const
  })

  const linePath = pts
    .map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`)
    .join(' ')
  const lastPt = pts[pts.length - 1]!
  const firstPt = pts[0]!
  const areaPath = filled
    ? `${linePath} L${lastPt[0].toFixed(2)},${height} L${firstPt[0].toFixed(2)},${height} Z`
    : ''

  return (
    <svg
      role="img"
      aria-hidden
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="none"
      className="block"
    >
      {filled && <path d={areaPath} fill="var(--chart-1)" fillOpacity={0.12} />}
      <path
        d={linePath}
        fill="none"
        stroke="var(--chart-1)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End-point dot for emphasis */}
      <circle cx={lastPt[0]} cy={lastPt[1]} r={1.6} fill="var(--chart-1)" />
    </svg>
  )
}
