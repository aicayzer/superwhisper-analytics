import { cn } from '@renderer/lib/cn'

interface PickRowProps {
  picked: boolean
  /** Primary content — plain-English label, usually with a small type
   *  tag suffix. */
  title: React.ReactNode
  /** Secondary line — sources use this for the dimmed canonical ref. */
  subtitle?: React.ReactNode
  /** Tertiary line — used for preview values. */
  preview?: React.ReactNode
  /** Top border is drawn unless `first` is true. */
  first?: boolean
  onClick: () => void
  className?: string
}

/**
 * Radio row used by the destination + field-source pickers. Visual
 * weight matches macOS native settings — small filled circle on pick,
 * subtle blue-tinted background row to reinforce the selection state.
 */
export function PickRow({
  picked,
  title,
  subtitle,
  preview,
  first,
  onClick,
  className
}: PickRowProps): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={picked}
      className={cn(
        'flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-foreground/[0.04]',
        picked && 'bg-accent-blue-bg/60 hover:bg-accent-blue-bg/80',
        !first && 'border-t border-border',
        className
      )}
    >
      <span
        aria-hidden
        className={cn(
          'mt-[3px] inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
          picked ? 'border-accent-blue bg-accent-blue' : 'border-border-strong bg-transparent'
        )}
      >
        {picked && <span className="h-[5px] w-[5px] rounded-full bg-white" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13px] font-medium text-foreground">{title}</span>
        {subtitle && (
          <span className="mt-0.5 block truncate text-[11.5px] text-muted-foreground/80">
            {subtitle}
          </span>
        )}
        {preview && (
          <span
            className="mt-1 block truncate text-[11.5px] italic leading-snug text-muted-foreground/60"
            title={typeof preview === 'string' ? preview : undefined}
          >
            {preview}
          </span>
        )}
      </span>
    </button>
  )
}
