import { cn } from '@renderer/lib/cn'

export type VariantId = 'a' | 'b' | 'c'

const VARIANTS: Array<{ id: VariantId; label: string; hint: string }> = [
  { id: 'a', label: 'Cards', hint: 'Bordered cards, flat KPIs' },
  { id: 'b', label: 'Flat', hint: 'Typography-led, no cards' },
  { id: 'c', label: 'Compact', hint: 'Denser type and spacing' }
]

interface SwitcherProps {
  current: VariantId
  onChange: (id: VariantId) => void
}

/**
 * Small segmented control for picking an Overview style variant. Lives at
 * the top-right of the Overview screen — scoped to that screen, not the
 * topbar. Disappears in production once a single variant is chosen.
 */
export function Switcher({ current, onChange }: SwitcherProps): React.JSX.Element {
  return (
    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-card p-0.5 text-[12px]">
      {VARIANTS.map((v) => {
        const active = v.id === current
        return (
          <button
            key={v.id}
            type="button"
            onClick={() => onChange(v.id)}
            title={v.hint}
            aria-pressed={active}
            className={cn(
              'rounded px-2 py-0.5 transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40',
              active
                ? 'bg-foreground/[0.06] font-medium text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {v.label}
          </button>
        )
      })}
    </div>
  )
}
