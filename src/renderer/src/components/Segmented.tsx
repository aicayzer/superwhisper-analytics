import { cn } from '@renderer/lib/cn'

/**
 * Three-or-more-choice segmented control. Used for the appearance
 * toggle in Settings, but generic — pass any string-keyed list.
 *
 * Active segment uses a neutral lifted surface (white-ish in light,
 * lifted grey in dark) rather than the accent-blue. The accent is
 * reserved for content selection (transcript highlights, hover-word
 * matches) — controls keep a calmer surface so the eye reads the page
 * rather than darting to whichever segment is selected.
 */
interface SegmentedProps<T extends string> {
  value: T
  onChange: (next: T) => void
  options: ReadonlyArray<{ value: T; label: string }>
  ariaLabel: string
  className?: string
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className
}: SegmentedProps<T>): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex h-8 items-center gap-0.5 rounded-md border border-border bg-foreground/[0.03] p-0.5',
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(opt.value)}
            className={cn(
              'h-7 rounded-[5px] px-3 text-[12.5px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40',
              active
                ? 'bg-background text-foreground shadow-[0_0_0_1px_var(--border)]'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}
