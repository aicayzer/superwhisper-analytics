import { cn } from '@renderer/lib/cn'
import { Minus, Plus } from 'lucide-react'

interface StepperProps {
  value: number
  onChange: (next: number) => void
  min?: number
  max?: number
  step?: number
  /** Unit suffix shown next to the value (e.g. "min"). Visually dimmed
   *  so the value reads first. */
  unit?: string
  /** Width of the value display column. Default 64px is enough for two
   *  digits + a short unit. */
  width?: number
  disabled?: boolean
  className?: string
}

/**
 * Numeric stepper: − / value / +. Sits at the same height as Switch
 * (22px tall track equivalent) so it lines up with toggle rows.
 *
 * Deliberately built as a small composition rather than wrapping a
 * native `<input type="number">` — the latter has inconsistent platform
 * styling and the up/down spinner can't be made to match. The two
 * buttons keep keyboarded operation in reach (Tab + Enter).
 */
export function Stepper({
  value,
  onChange,
  min = 1,
  max = 999,
  step = 1,
  unit,
  width = 64,
  disabled,
  className
}: StepperProps): React.JSX.Element {
  const dec = (): void => {
    if (disabled) return
    onChange(Math.max(min, value - step))
  }
  const inc = (): void => {
    if (disabled) return
    onChange(Math.min(max, value + step))
  }
  return (
    <div
      className={cn(
        'inline-flex h-7 items-center overflow-hidden rounded-md border border-border-strong bg-card',
        disabled && 'opacity-50',
        className
      )}
    >
      <StepperBtn onClick={dec} disabled={disabled || value <= min} ariaLabel="Decrease">
        <Minus className="h-3 w-3" strokeWidth={2} />
      </StepperBtn>
      <span
        className="flex h-full items-center justify-center border-x border-border text-[12.5px] tabular-nums"
        style={{ minWidth: width }}
      >
        <span className="font-medium text-foreground">{value}</span>
        {unit && <span className="ml-1 text-muted-foreground">{unit}</span>}
      </span>
      <StepperBtn onClick={inc} disabled={disabled || value >= max} ariaLabel="Increase">
        <Plus className="h-3 w-3" strokeWidth={2} />
      </StepperBtn>
    </div>
  )
}

function StepperBtn({
  onClick,
  disabled,
  ariaLabel,
  children
}: {
  onClick: () => void
  disabled?: boolean
  ariaLabel: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex h-full w-7 items-center justify-center text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
    >
      {children}
    </button>
  )
}
