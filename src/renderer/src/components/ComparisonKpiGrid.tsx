import { cn } from '@renderer/lib/cn'
import { ArrowDown, ArrowUp, Minus } from 'lucide-react'

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
 * 6-card KPI grid showing period-over-period comparisons.
 *
 *   ┌─────────────────────────────┐
 *   │ RECORDINGS         ↓ 6.9%   │ ← label left, pct badge top-right
 *   │                             │
 *   │ 11.1k                       │ ← big current value
 *   └─────────────────────────────┘
 *
 * Cards stay the same height across every range. The corner badge is
 * always in the DOM so the top row's intrinsic height never changes,
 * but when no previous-period comparison is available (range = All
 * time) the badge is set to `visibility: hidden` so it disappears
 * visually while keeping the layout slot. No "—" placeholder.
 *
 * The previous period's value is intentionally hidden in the main view;
 * the percentage carries that information without doubling card height.
 * Hovering the badge surfaces the prev value as a tooltip.
 *
 * Arrows are monochrome. Treating "filler rate down" as green or "WPM up"
 * as red would imply judgements the app shouldn't make.
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

  // Badge always renders so the top row's height is identical across
  // ranges. When there's no prior window (range = All time) the badge is
  // made fully invisible via `visibility: hidden` — that hides it
  // visually but keeps the same intrinsic size, so the card heights stay
  // consistent whether or not a comparison is available.
  return (
    <div className="rounded-xl border border-border bg-card px-5 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <span
          aria-hidden={!hasPrev}
          className={cn(
            'inline-flex items-center gap-0.5 rounded-md bg-foreground/[0.05] px-1.5 py-0.5 text-[11px] tabular-nums text-muted-foreground',
            !hasPrev && 'invisible'
          )}
          title={hasPrev ? `Previous period: ${fmt(previous)}${unit ?? ''}` : undefined}
        >
          {direction === 'up' ? (
            <ArrowUp className="h-3 w-3" strokeWidth={2} />
          ) : direction === 'down' ? (
            <ArrowDown className="h-3 w-3" strokeWidth={2} />
          ) : (
            <Minus className="h-3 w-3" strokeWidth={2} />
          )}
          {hasPrev ? `${Math.abs(pct).toFixed(1)}%` : '0.0%'}
        </span>
      </div>
      <div className="mt-3 text-[26px] font-semibold leading-none tabular-nums text-foreground">
        {fmt(current)}
        {unit && <span className="ml-0.5 text-[14px] font-medium">{unit}</span>}
      </div>
    </div>
  )
}
