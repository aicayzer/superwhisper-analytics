import { cn } from '@renderer/lib/cn'
import { ArrowDown, ArrowRight, ArrowUp } from 'lucide-react'

interface KpiCardSpec {
  label: string
  /** Optional inline unit shown after the value ("wpm", "%"). */
  unit?: string
  /** Current value (range-filtered). */
  current: number
  /** Previous-period value, or null when comparison is unavailable. */
  previous: number | null
  /** Formatter for the displayed value. Defaults to `String`. */
  format?: (v: number) => string
}

interface ComparisonKpiGridProps {
  items: KpiCardSpec[]
  className?: string
}

/**
 * 6-card KPI grid showing period-over-period comparisons. When the active
 * range is "All time" the `previous` prop is null and only the current
 * value is shown — there's no meaningful prior window for an unbounded
 * range.
 *
 * Card layout:
 *
 *   ┌──────────────────────────┐
 *   │ LABEL                    │  ← uppercase muted
 *   │ <prev> → <current>       │  ← prev faded, current bold; if no prev,
 *   │                          │     just the current value
 *   │ ↓ 6.9%                   │  ← direction-coloured delta (or hidden)
 *   └──────────────────────────┘
 *
 * Arrows are monochrome by design — colouring "down" red on the
 * filler-rate card would imply judgement we don't want to make. Anyone
 * who treats "down filler rate" as good can read the number themselves.
 */
export function ComparisonKpiGrid({ items, className }: ComparisonKpiGridProps): React.JSX.Element {
  return (
    <div className={cn('grid grid-cols-2 gap-3 md:grid-cols-3', className)}>
      {items.map((it) => (
        <Card key={it.label} {...it} />
      ))}
    </div>
  )
}

function Card({ label, unit, current, previous, format }: KpiCardSpec): React.JSX.Element {
  const fmt = format ?? String
  const hasPrev = previous !== null
  const pct = hasPrev && previous !== 0 ? ((current - previous) / Math.abs(previous)) * 100 : 0
  const direction: 'up' | 'down' | 'flat' =
    !hasPrev || Math.abs(pct) < 0.05 ? 'flat' : pct > 0 ? 'up' : 'down'

  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        {hasPrev && (
          <>
            <span className="text-[18px] tabular-nums text-muted-foreground/70">
              {fmt(previous!)}
              {unit && <span className="ml-0.5 text-[12px]">{unit}</span>}
            </span>
            <ArrowRight className="h-4 w-4 text-muted-foreground/60" strokeWidth={1.8} />
          </>
        )}
        <span className="text-[24px] font-semibold leading-none tabular-nums text-foreground">
          {fmt(current)}
          {unit && <span className="ml-0.5 text-[13px] font-medium">{unit}</span>}
        </span>
      </div>
      {hasPrev && (
        <div className="mt-3 flex items-center gap-1 text-[12px] text-muted-foreground">
          {direction === 'up' && <ArrowUp className="h-3 w-3" strokeWidth={2} />}
          {direction === 'down' && <ArrowDown className="h-3 w-3" strokeWidth={2} />}
          <span className="tabular-nums">
            {direction === 'flat' ? '—' : `${Math.abs(pct).toFixed(1)}%`}
          </span>
        </div>
      )}
    </div>
  )
}
