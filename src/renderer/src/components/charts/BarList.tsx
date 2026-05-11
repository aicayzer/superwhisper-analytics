import { cn } from '@renderer/lib/cn'
import { memo, useEffect, useRef, useState } from 'react'

interface BarListItem {
  label: string
  count: number
}

interface BarListProps {
  data: BarListItem[]
  /** Minimum row height. The visible row count adapts to the container
   *  height — when there isn't room for `data.length` rows at this
   *  minimum, the list truncates rather than overflowing into adjacent
   *  cards. Default 22px. */
  minRowHeight?: number
  /** Maximum row height (px). Caps how tall a row can grow when the
   *  dataset is short. Without this, 3 phrases in a 400px card give
   *  133px-tall bars — visually unbalanced. Default 36. */
  maxRowHeight?: number
  /** Maximum width of the label column in px. Labels auto-size to the
   *  widest entry within this bound — short label sets give skinnier
   *  columns and longer bars. Default 140. */
  maxLabelWidth?: number
  className?: string
}

/**
 * Compact horizontal-bar list used by the Top Words + Filler Words cards
 * on the Language home page.
 *
 * Differs from Recharts' HBar in three ways:
 *   • Rows are real DOM elements, not Recharts geometry — much cheaper
 *     to render than spinning up a ResponsiveContainer per card.
 *   • The visible row count is *bounded by container height* via a
 *     ResizeObserver. When the card is short the list shows fewer items
 *     (down to 1) so rows never spill into the next chart. When it's
 *     tall, all `data.length` items are visible and rows grow until they
 *     hit `maxRowHeight`.
 *   • Each row uses `flex: 1 1 0` between min/max bounds so rows are
 *     evenly distributed across the available height.
 */
function BarListInner({
  data,
  minRowHeight = 22,
  maxRowHeight = 36,
  maxLabelWidth = 140,
  className
}: BarListProps): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState<number>(data.length)

  // Recompute on container resize. Floor by minRowHeight gives the
  // maximum number of rows that still fit at the readability floor.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const compute = (): void => {
      const h = el.clientHeight
      const fit = Math.max(1, Math.floor(h / minRowHeight))
      setVisibleCount(fit)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [minRowHeight])

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[12.5px] text-muted-foreground">
        No data.
      </div>
    )
  }

  const visible = data.slice(0, Math.min(visibleCount, data.length))
  const max = visible.reduce((m, d) => (d.count > m ? d.count : m), 0) || 1

  // Grid: three columns (label content-sized, bar fills, count fixed) plus
  // one row per item bounded by min/max-row-height. Rows distribute the
  // available height evenly without forcing wide gutters when labels are
  // short.
  return (
    <div
      ref={containerRef}
      className={cn('grid h-full overflow-hidden px-1', className)}
      style={{
        gridTemplateColumns: 'minmax(0, max-content) minmax(0, 1fr) auto',
        gridTemplateRows: `repeat(${visible.length}, minmax(${minRowHeight}px, ${maxRowHeight}px))`,
        columnGap: '0.5rem'
      }}
    >
      {visible.map((d, i) => {
        const pct = (d.count / max) * 100
        return (
          <div key={`${i}-${d.label}`} className="contents">
            <span
              className="flex min-w-0 items-center truncate text-right text-[11.5px] text-muted-foreground"
              style={{ maxWidth: maxLabelWidth }}
              title={d.label}
            >
              {d.label}
            </span>
            <div className="flex items-center">
              <div className="h-2.5 w-full overflow-hidden rounded-sm bg-foreground/[0.06]">
                <div
                  className="h-full rounded-sm bg-[var(--chart-1)] transition-[width] duration-200 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <span className="flex w-12 items-center justify-end text-right tabular-nums text-[11.5px] text-muted-foreground">
              {d.count.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export const BarList = memo(BarListInner)
