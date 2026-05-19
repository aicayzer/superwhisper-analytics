import { cn } from '@renderer/lib/cn'

interface PathBarProps {
  /** Path to display. `null` renders the empty-state placeholder. */
  path: string | null
  placeholder?: string
  /** Click handler for the trailing button. When omitted the button is
   *  hidden — useful when the bar is purely informational. */
  onChoose?: () => void
  /** Label for the trailing button. Defaults to "Choose folder". */
  chooseLabel?: string
  /** Click handler for the path itself — e.g. "open in Finder". The path
   *  is rendered as a button when set; static text otherwise. */
  onOpenPath?: () => void
  className?: string
}

/**
 * Path row used by the Recordings folder card.
 *
 * Plain text path on the left, action button on the right, with a
 * subtle grey wash so it reads as one inline field — calm enough not
 * to dominate the card, distinct enough to know it's interactive.
 */
export function PathBar({
  path,
  placeholder = 'No folder selected',
  onChoose,
  chooseLabel = 'Choose folder',
  onOpenPath,
  className
}: PathBarProps): React.JSX.Element {
  const display = path ?? placeholder
  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-lg border border-border bg-foreground/[0.025] py-1.5 pl-3 pr-1.5',
        className
      )}
      title={path ?? placeholder}
    >
      {onOpenPath ? (
        <button
          type="button"
          onClick={onOpenPath}
          className="min-w-0 flex-1 truncate text-left text-[12.5px] leading-relaxed text-muted-foreground transition-colors hover:text-foreground"
        >
          {display}
        </button>
      ) : (
        <span className="min-w-0 flex-1 truncate text-[12.5px] leading-relaxed text-muted-foreground">
          {display}
        </span>
      )}
      {onChoose && (
        <button
          type="button"
          onClick={onChoose}
          className="inline-flex h-6 shrink-0 items-center whitespace-nowrap rounded-md border border-border bg-card px-2.5 text-[11.5px] text-foreground transition-colors hover:bg-foreground/5"
        >
          {chooseLabel}
        </button>
      )}
    </div>
  )
}
