import { cn } from '@renderer/lib/cn'

interface SegmentedTab<T extends string> {
  id: T
  label: string
}

interface SegmentedTabsProps<T extends string> {
  value: T
  onChange: (next: T) => void
  options: ReadonlyArray<SegmentedTab<T>>
  ariaLabel?: string
  className?: string
}

/**
 * Compact segmented control used inside content areas (e.g. the Settings
 * page tab strip). Visual rhyme with the navbar RangePill — same lifted
 * "active pill" treatment so the chrome reads as one consistent design
 * language across the app.
 *
 * Generic on the option id type so call sites get string-literal
 * narrowing for free: `useState<'general' | 'data' | 'about'>('general')`
 * flows through without casts.
 */
export function SegmentedTabs<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className
}: SegmentedTabsProps<T>): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex h-7 items-center self-start rounded-[8px] border border-border bg-foreground/[0.03] p-0.5',
        className
      )}
    >
      {options.map((opt) => {
        const active = value === opt.id
        return (
          <button
            key={opt.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.id)}
            className={cn(
              'relative inline-flex h-6 items-center rounded-[5px] px-3 text-[11.5px] font-medium transition-colors',
              // Keyboard focus uses a subtle background tint rather than
              // a ring — the ring used to read as a persistent "selected"
              // state when users tabbed through and looked the same as
              // an in-progress click. The bg tint hints at focus without
              // competing visually with the active-pill treatment.
              'focus-visible:outline-none focus-visible:bg-foreground/[0.04]',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active && (
              <span
                aria-hidden
                className="absolute inset-x-0 top-px bottom-px rounded-[5px] bg-background shadow-[0_0_0_1px_var(--border)]"
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
