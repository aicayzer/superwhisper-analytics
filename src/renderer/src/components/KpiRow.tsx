import { Sparkline } from '@renderer/components/charts/Sparkline'
import { cn } from '@renderer/lib/cn'
import { useEffect, useRef, useState } from 'react'

export interface KpiSpec {
  label: string
  value: string
  /** Optional trailing trend series. Renders a sparkline next to the value. */
  spark?: number[]
}

interface KpiRowProps {
  items: KpiSpec[]
  className?: string
}

/**
 * Unified KPI strip. Bordered rounded-xl container, tight typography.
 * Used by Overview, Usage and Language so the headline row is consistent
 * across screens. Each KPI optionally carries a 30-day sparkline for a
 * quiet trend cue.
 *
 * The previous design carried a `sub` caption per cell (e.g. "of 91 in
 * window", "longest 11d") — that was dropped because the captions
 * doubled the visual weight of the strip and the labels carry enough
 * meaning on their own. If a metric needs disambiguation it should
 * change its label, not append a grey footnote.
 */
export function KpiRow({ items, className }: KpiRowProps): React.JSX.Element {
  return (
    <div
      className={cn('grid gap-3', className)}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((it) => (
        <Cell key={it.label} {...it} />
      ))}
    </div>
  )
}

/** Below this card width (px) the sparkline crowds the value text; we
 *  measure the cell with ResizeObserver and hide the spark when narrow.
 *  Six KPIs at 800px window width hit ~140px each — comfortably under
 *  this threshold. Four KPIs sit around 180px+, so the trend cue stays. */
const SPARK_HIDE_BELOW = 160

function Cell({ label, value, spark }: KpiSpec): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [showSpark, setShowSpark] = useState(true)
  useEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const update = (): void => setShowSpark(el.clientWidth >= SPARK_HIDE_BELOW)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="rounded-xl border border-border bg-card px-4 py-3">
      <div className="text-[12px] font-medium text-foreground">{label}</div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="text-[22px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
          {value}
        </div>
        {showSpark && spark && spark.length > 1 && (
          <div className="shrink-0 pb-0.5">
            <Sparkline values={spark} width={64} height={18} />
          </div>
        )}
      </div>
    </div>
  )
}
