import { Sparkline } from '@renderer/components/charts/Sparkline'
import { cn } from '@renderer/lib/cn'

export interface KpiSpec {
  label: string
  value: string
  /** Optional secondary line (e.g. "11 active days"). */
  sub?: string
  /** Optional trailing trend series. Renders a sparkline next to the value. */
  spark?: number[]
}

interface KpiRowProps {
  items: KpiSpec[]
  className?: string
}

/**
 * Unified KPI strip. Bordered rounded-xl container with vertical dividers,
 * tight typography. Used by Overview, Usage and Language so the headline
 * row is consistent across screens. Each KPI optionally carries a 30-day
 * sparkline for a quiet trend cue.
 */
export function KpiRow({ items, className }: KpiRowProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'grid divide-x divide-border rounded-xl border border-border bg-card',
        className
      )}
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((it) => (
        <Cell key={it.label} {...it} />
      ))}
    </div>
  )
}

function Cell({ label, value, sub, spark }: KpiSpec): React.JSX.Element {
  return (
    <div className="px-5 py-3">
      <div className="text-[12px] font-medium text-foreground">{label}</div>
      <div className="mt-1 flex items-end justify-between gap-3">
        <div className="text-[22px] font-semibold leading-none tracking-tight tabular-nums text-foreground">
          {value}
        </div>
        {spark && spark.length > 1 && (
          <div className="shrink-0 pb-0.5">
            <Sparkline values={spark} width={64} height={18} />
          </div>
        )}
      </div>
      {sub && <div className="mt-1.5 text-[11.5px] text-muted-foreground">{sub}</div>}
    </div>
  )
}
