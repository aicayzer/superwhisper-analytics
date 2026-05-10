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
  /** Width of the label column in px. */
  labelWidth?: number
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
  labelWidth = 96,
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

  return (
    <div ref={containerRef} className={cn('flex h-full flex-col overflow-hidden', className)}>
      {visible.map((d, i) => {
        const pct = (d.count / max) * 100
        return (
          <div
            key={`${i}-${d.label}`}
            className="flex items-center gap-2 px-1"
            style={{ flex: '1 1 0', minHeight: 0, maxHeight: maxRowHeight }}
          >
            <span
              className="shrink-0 truncate text-right text-[11.5px] text-muted-foreground"
              style={{ width: labelWidth }}
              title={d.label}
            >
              {d.label}
            </span>
            <div className="relative flex min-w-0 flex-1 items-center">
              <div className="h-2.5 w-full overflow-hidden rounded-sm bg-foreground/[0.06]">
                <div
                  className="h-full rounded-sm bg-[var(--chart-1)] transition-[width] duration-200 ease-out"
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
            <span className="w-12 shrink-0 text-right tabular-nums text-[11.5px] text-muted-foreground">
              {d.count.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export const BarList = memo(BarListInner)
