import { cn } from '@renderer/lib/cn'
import { memo } from 'react'

interface BarListItem {
  label: string
  count: number
}

interface BarListProps {
  data: BarListItem[]
  /** Min row height in px. Rows flex to fill the container; this is the
   *  floor so labels stay readable when the data is short. */
  minRowHeight?: number
  /** Width of the label column in px. */
  labelWidth?: number
  className?: string
}

/**
 * Compact horizontal-bar list used by the Top Words + Filler Words cards
 * on the Language home page.
 *
 * Differs from Recharts' HBar in two ways:
 *   • Rows are real DOM elements with `flex: 1 1 0`, so when the list has
 *     fewer items than fits the card they stretch to fill the height
 *     evenly. A 10-row chart on a 300px card gives 30px rows; the same 10
 *     rows on a 200px card give 20px rows.
 *   • The container is scrollable. With ~80 default filler phrases it's
 *     plausible the chart will need to show more than fits — overflow-y
 *     keeps the rest reachable.
 */
function BarListInner({
  data,
  minRowHeight = 22,
  labelWidth = 96,
  className
}: BarListProps): React.JSX.Element {
  if (data.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-[12.5px] text-muted-foreground">
        No data.
      </div>
    )
  }
  const max = data.reduce((m, d) => (d.count > m ? d.count : m), 0) || 1

  return (
    <div className={cn('flex h-full flex-col overflow-y-auto', className)}>
      {data.map((d, i) => {
        const pct = (d.count / max) * 100
        return (
          <div
            key={`${i}-${d.label}`}
            className="flex items-center gap-2 px-1"
            style={{ flex: '1 1 0', minHeight: minRowHeight }}
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
            <span className="w-10 shrink-0 text-right tabular-nums text-[11.5px] text-muted-foreground">
              {d.count.toLocaleString()}
            </span>
          </div>
        )
      })}
    </div>
  )
}

export const BarList = memo(BarListInner)
