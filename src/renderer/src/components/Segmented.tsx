import { cn } from '@renderer/lib/cn'

/**
 * Three-or-more-choice segmented control. Used for the appearance
 * toggle in Settings, but generic — pass any string-keyed list.
 *
 * Active segment uses the accent-blue token pair so it lines up with
 * the rest of the chrome's "active" surfaces (transcript highlights,
 * word-hover, etc.).
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
                ? 'bg-accent-blue-bg text-accent-blue'
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
