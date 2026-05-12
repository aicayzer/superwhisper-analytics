import { cn } from '@renderer/lib/cn'

/**
 * Two-or-more-choice segmented control. Used for the appearance toggle in
 * Settings, the transcript view-mode picker, and the command-palette
 * Search/Commands switch. Generic over the value type.
 *
 * Active segment uses a neutral lifted surface (white-ish in light, lifted
 * grey in dark) rather than the accent-blue. The accent is reserved for
 * content selection (transcript highlights, hover-word matches) — controls
 * keep a calmer surface so the eye reads the page rather than darting to
 * whichever segment is selected.
 *
 * `size='sm'` is the compact variant for chrome (palette header). Default
 * `'md'` is the settings-page size.
 */
interface SegmentedProps<T extends string> {
  value: T
  onChange: (next: T) => void
  options: ReadonlyArray<{ value: T; label: string }>
  ariaLabel: string
  className?: string
  size?: 'sm' | 'md'
}

const TRACK_BY_SIZE = {
  md: 'h-8 gap-0.5 p-0.5',
  sm: 'h-6 gap-0 p-0.5'
}
const BUTTON_BY_SIZE = {
  md: 'h-7 rounded-[6px] px-3 text-[12.5px]',
  sm: 'h-5 rounded-[5px] px-2 text-[11px]'
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  ariaLabel,
  className,
  size = 'md'
}: SegmentedProps<T>): React.JSX.Element {
  return (
    <div
      role="radiogroup"
      aria-label={ariaLabel}
      className={cn(
        'inline-flex items-center rounded-[8px] border border-border bg-foreground/[0.03]',
        TRACK_BY_SIZE[size],
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
              'relative inline-flex items-center justify-center font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40',
              BUTTON_BY_SIZE[size],
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active && (
              <span
                aria-hidden
                className={cn(
                  'absolute inset-x-0 top-px bottom-px bg-background shadow-[0_0_0_1px_var(--border)]',
                  // Match the button's own corner radius so the highlight tracks it.
                  size === 'sm' ? 'rounded-[5px]' : 'rounded-[6px]'
                )}
              />
            )}
            <span className="relative">{opt.label}</span>
          </button>
        )
      })}
    </div>
  )
}
