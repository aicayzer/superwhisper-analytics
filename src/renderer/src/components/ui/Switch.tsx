import { cn } from '@renderer/lib/cn'

interface SwitchProps {
  checked: boolean
  onChange: (next: boolean) => void
  disabled?: boolean
  ariaLabel?: string
  /** Optional id that pairs the switch with a `<label>` somewhere on the page. */
  id?: string
}

/**
 * Small inline iOS-style switch. Blue track + white knob when on, muted
 * track + white knob when off, dimmed when disabled.
 *
 * Hand-rolled rather than pulling in @radix-ui/react-switch — the surface
 * area we need is minimal and the visual treatment matches the rest of
 * Settings (small, neutral) better than the Radix default.
 */
export function Switch({
  checked,
  onChange,
  disabled,
  ariaLabel,
  id
}: SwitchProps): React.JSX.Element {
  return (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-[22px] w-9 shrink-0 items-center rounded-full transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        disabled && 'cursor-not-allowed opacity-50',
        checked ? 'bg-accent-blue' : 'bg-foreground/[0.18]'
      )}
    >
      <span
        aria-hidden
        className={cn(
          'inline-block h-[18px] w-[18px] rounded-full bg-background shadow-sm transition-transform',
          checked ? 'translate-x-[18px]' : 'translate-x-0.5'
        )}
      />
    </button>
  )
}
