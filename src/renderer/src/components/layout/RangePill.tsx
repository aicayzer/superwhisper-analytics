import { Calendar } from '@renderer/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { cn } from '@renderer/lib/cn'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { RANGE_PRESETS, rangeShortLabel, type RangeValue } from './rangeOptions'

interface RangePillProps {
  value: RangeValue
  onChange: (next: RangeValue) => void
}

/**
 * Inline segmented date-range picker that lives in the navbar's top-right.
 *
 *   ┌────┬────┬────┬──────────┬────────┐
 *   │ 7d │30d │90d │ All time │ Custom │
 *   └────┴────┴────┴──────────┴────────┘
 *
 * Active segment uses the neutral lifted-pill treatment (white-ish in
 * light mode, lifted-grey in dark). Custom opens a Popover with a
 * two-month calendar in range mode — same behaviour as the previous
 * dropdown-style picker, just surfaced as a segment so the active
 * picked range is visible at a glance.
 */
export function RangePill({ value, onChange }: RangePillProps): React.JSX.Element {
  const [customOpen, setCustomOpen] = useState(false)
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    value.id === 'custom' && value.from ? { from: value.from, to: value.to } : undefined
  )

  const applyCustom = (): void => {
    if (!draftRange?.from) return
    onChange({ id: 'custom', from: draftRange.from, to: draftRange.to })
    setCustomOpen(false)
  }

  const isCustomActive = value.id === 'custom'

  return (
    <div
      role="radiogroup"
      aria-label="Date range"
      className="inline-flex h-7 items-center rounded-[8px] border border-border bg-foreground/[0.03] p-0.5 [-webkit-app-region:no-drag]"
    >
      {RANGE_PRESETS.map((p) => {
        const active = value.id === p.id
        return (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange({ id: p.id })}
            className={cn(
              'relative inline-flex h-6 items-center px-2 text-[11.5px] font-medium transition-colors',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40',
              active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {active && <ActivePill />}
            <span className="relative">{p.pill}</span>
          </button>
        )
      })}
      <Popover open={customOpen} onOpenChange={setCustomOpen}>
        <PopoverTrigger
          role="radio"
          aria-checked={isCustomActive}
          className={cn(
            'relative inline-flex h-6 items-center px-2 text-[11.5px] font-medium transition-colors',
            'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40',
            isCustomActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {isCustomActive && <ActivePill />}
          <span className="relative tabular-nums">
            {isCustomActive && value.from ? rangeShortLabel(value) : 'Custom'}
          </span>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-auto p-0 text-[12.5px]">
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
              <span className="px-1 text-muted-foreground">Pick a custom range</span>
              <button
                type="button"
                onClick={applyCustom}
                disabled={!draftRange?.from}
                className="rounded-md bg-primary px-2.5 py-1 text-[11.5px] font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                Apply
              </button>
            </div>
            <Calendar
              mode="range"
              selected={draftRange}
              onSelect={setDraftRange}
              numberOfMonths={2}
              autoFocus
            />
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

/**
 * The "white pill" that demarcates the active segment. Inset 1px from the
 * top and bottom of the button so the highlight sits visibly inside the
 * surrounding track instead of filling it edge-to-edge.
 */
function ActivePill(): React.JSX.Element {
  return (
    <span
      aria-hidden
      className="absolute inset-x-0 top-px bottom-px rounded-[5px] bg-background shadow-[0_0_0_1px_var(--border)]"
    />
  )
}
