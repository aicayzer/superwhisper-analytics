import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@renderer/components/ui/dropdown-menu'
import { CalendarRange, ChevronDown } from 'lucide-react'
import { RANGE_OPTIONS } from './rangeOptions'

interface RangePillProps {
  value: string
  onChange: (id: string) => void
}

/**
 * Subtle button-style range selector. Foundation aesthetic — calendar glyph,
 * compact label, chevron. No heavy fill, no border at rest. Active dropdown
 * uses the shadcn DropdownMenu.
 */
export function RangePill({ value, onChange }: RangePillProps): React.JSX.Element {
  const current = RANGE_OPTIONS.find((o) => o.id === value) ?? RANGE_OPTIONS[2]!
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="inline-flex h-8 items-center gap-1.5 rounded-md px-2 text-[12.5px] text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40 [-webkit-app-region:no-drag]"
        aria-label="Date range"
      >
        <CalendarRange className="h-3.5 w-3.5" strokeWidth={1.8} />
        <span className="tabular-nums">{current.short}</span>
        <ChevronDown className="h-3 w-3" strokeWidth={1.8} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-[12.5px]">
        {RANGE_OPTIONS.map((o) => (
          <DropdownMenuItem
            key={o.id}
            onSelect={() => onChange(o.id)}
            className={o.id === value ? 'text-foreground' : ''}
          >
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
