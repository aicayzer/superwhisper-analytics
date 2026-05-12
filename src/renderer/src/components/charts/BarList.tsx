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
   *  cards. Default 20px. */
  minRowHeight?: number
  /** Maximum row height (px). Caps how tall a row can grow when the
   *  dataset is short. Without this, 3 phrases in a 400px card give
   *  133px-tall bars — visually unbalanced. Default 28. */
  maxRowHeight?: number
  /** Maximum width of the label column in px. Labels auto-size to the
   *  widest entry within this bound — short label sets give skinnier
   *  columns and longer bars. Default 140. */
  maxLabelWidth?: number
  /** When `2`, render two side-by-side columns of bars (data split
   *  left/right). Default `1` (single column). When the dataset is
   *  smaller than `singleColumnBelow` the layout always collapses to
   *  one column regardless of this prop — splitting 3 entries 2/1 looks
   *  silly. */
  columns?: 1 | 2
  /** Threshold (count) at and below which `columns=2` collapses to one
   *  full-width column. Default 6. */
  singleColumnBelow?: number
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
  minRowHeight = 20,
  maxRowHeight = 28,
  maxLabelWidth = 140,
  columns = 1,
  singleColumnBelow = 6,
  className
}: BarListProps): React.JSX.Element {
  // Collapse to one column when there are too few entries to split — a
  // 2/1 split on three phrases reads as broken.
  const effectiveColumns: 1 | 2 = columns === 2 && data.length > singleColumnBelow ? 2 : 1

  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState<number>(data.length)

  // Recompute on container resize. Floor by minRowHeight gives the
  // maximum number of rows that still fit at the readability floor. With
  // two columns we use the per-column row count, then multiply by 2 to
  // get total visible items.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return undefined
    const compute = (): void => {
      const h = el.clientHeight
      const rowsPerColumn = Math.max(1, Math.floor(h / minRowHeight))
      setVisibleCount(rowsPerColumn * effectiveColumns)
    }
    compute()
    const ro = new ResizeObserver(compute)
    ro.observe(el)
    return () => ro.disconnect()
  }, [minRowHeight, effectiveColumns])

  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[12.5px] text-muted-foreground">
        No data.
      </div>
    )
  }

  const visible = data.slice(0, Math.min(visibleCount, data.length))
  // Compute max across the FULL visible set so both columns share the same
  // scale — otherwise the right column's smaller counts would render with
  // the same width as the left column's bigger ones.
  const max = visible.reduce((m, d) => (d.count > m ? d.count : m), 0) || 1

  if (effectiveColumns === 2) {
    const half = Math.ceil(visible.length / 2)
    const left = visible.slice(0, half)
    const right = visible.slice(half)
    return (
      <div ref={containerRef} className={cn('grid h-full grid-cols-2 gap-x-4', className)}>
        <BarColumn
          rows={left}
          max={max}
          minRowHeight={minRowHeight}
          maxRowHeight={maxRowHeight}
          maxLabelWidth={maxLabelWidth}
        />
        <BarColumn
          rows={right}
          max={max}
          minRowHeight={minRowHeight}
          maxRowHeight={maxRowHeight}
          maxLabelWidth={maxLabelWidth}
        />
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('h-full', className)}>
      <BarColumn
        rows={visible}
        max={max}
        minRowHeight={minRowHeight}
        maxRowHeight={maxRowHeight}
        maxLabelWidth={maxLabelWidth}
      />
    </div>
  )
}

interface BarColumnProps {
  rows: BarListItem[]
  max: number
  minRowHeight: number
  maxRowHeight: number
  maxLabelWidth: number
}

/** One vertical stack of label / bar / count rows. Pulled out so the
 *  two-column layout doesn't need to weave row indices together. */
function BarColumn({
  rows,
  max,
  minRowHeight,
  maxRowHeight,
  maxLabelWidth
}: BarColumnProps): React.JSX.Element {
  if (rows.length === 0) return <div />
  return (
    <div
      className="grid h-full overflow-hidden px-1"
      style={{
        gridTemplateColumns: 'minmax(0, max-content) minmax(0, 1fr) auto',
        gridTemplateRows: `repeat(${rows.length}, minmax(${minRowHeight}px, ${maxRowHeight}px))`,
        columnGap: '0.5rem'
      }}
    >
      {rows.map((d, i) => {
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
            <span className="flex w-10 items-center justify-end text-right tabular-nums text-[11.5px] text-muted-foreground">
              {d.count.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export const BarList = memo(BarListInner) as typeof BarListInner
