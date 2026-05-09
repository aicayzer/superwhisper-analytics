import { Calendar } from '@renderer/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@renderer/components/ui/popover'
import { CalendarRange, Check, ChevronDown, ChevronLeft } from 'lucide-react'
import { useState } from 'react'
import type { DateRange } from 'react-day-picker'
import { RANGE_PRESETS, rangeShortLabel, type RangeValue } from './rangeOptions'

interface RangePillProps {
  value: RangeValue
  onChange: (next: RangeValue) => void
}

/**
 * Subtle button-style range selector with two-step content:
 *   1. Preset list (last 7 days … all time, plus a "Custom range" option)
 *   2. ShadCN Calendar in range mode if Custom is picked
 *
 * No border at rest, ghost hover. Keeps the Foundation aesthetic from the
 * old DropdownMenu version but swaps for a Popover so the calendar can
 * live in the same surface.
 */
export function RangePill({ value, onChange }: RangePillProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<'presets' | 'custom'>(
    value.id === 'custom' ? 'custom' : 'presets'
  )
  const [draftRange, setDraftRange] = useState<DateRange | undefined>(
    value.id === 'custom' && value.from ? { from: value.from, to: value.to } : undefined
  )

  const close = (): void => {
    setOpen(false)
    // Reset to the active view next open so the user lands on presets
    // unless they explicitly confirmed a custom range.
    setTimeout(() => setView(value.id === 'custom' ? 'custom' : 'presets'), 150)
  }

  const choosePreset = (id: string): void => {
    onChange({ id })
    close()
  }

  const applyCustom = (): void => {
    if (draftRange?.from) {
      onChange({ id: 'custom', from: draftRange.from, to: draftRange.to })
      close()
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12.5px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40 [-webkit-app-region:no-drag]"
        aria-label="Date range"
      >
        <CalendarRange className="h-3.5 w-3.5" strokeWidth={1.8} />
        <span className="tabular-nums">{rangeShortLabel(value)}</span>
        <ChevronDown className="h-3 w-3" strokeWidth={1.8} />
      </PopoverTrigger>
      <PopoverContent align="end" className="w-auto p-0 text-[12.5px]">
        {view === 'presets' ? (
          <div className="flex w-[200px] flex-col p-1">
            {RANGE_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => choosePreset(p.id)}
                className="flex items-center justify-between rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:bg-accent"
              >
                <span>{p.label}</span>
                {value.id === p.id && (
                  <Check className="h-3.5 w-3.5 text-foreground" strokeWidth={2} />
                )}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <button
              type="button"
              onClick={() => setView('custom')}
              className="flex items-center justify-between rounded-sm px-2 py-1.5 text-left transition-colors hover:bg-accent hover:text-accent-foreground focus:outline-none focus-visible:bg-accent"
            >
              <span>Custom range…</span>
              {value.id === 'custom' && (
                <Check className="h-3.5 w-3.5 text-foreground" strokeWidth={2} />
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-2 py-1.5">
              <button
                type="button"
                onClick={() => setView('presets')}
                className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
              >
                <ChevronLeft className="h-3.5 w-3.5" strokeWidth={1.8} />
                Presets
              </button>
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
        )}
      </PopoverContent>
    </Popover>
  )
}
