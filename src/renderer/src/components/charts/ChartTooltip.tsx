interface TooltipPayloadEntry {
  name?: string
  value?: number | string
  color?: string
}

interface ChartTooltipProps {
  active?: boolean
  payload?: TooltipPayloadEntry[]
  label?: string | number
}

/**
 * Shared tooltip used by Recharts wrappers — minimal, monotone, tabular nums.
 * Receives Recharts' default payload shape; renders a simple list.
 */
export function ChartTooltip({
  active,
  payload,
  label
}: ChartTooltipProps): React.JSX.Element | null {
  if (!active || !payload || payload.length === 0) return null
  return (
    <div className="rounded-md border border-border bg-card px-2.5 py-1.5 text-[11px] text-foreground shadow-[var(--shadow-float)]">
      {label !== undefined && (
        <div className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
      )}
      <div className="space-y-0.5">
        {payload.map((p, i) => (
          <div key={i} className="flex items-baseline gap-2 tabular-nums">
            {/* Dot sits on the row baseline by wrapping it in a flex shim
                of its own — items-baseline on the row would otherwise
                bottom-align the round indicator with the text descenders. */}
            <span aria-hidden className="flex shrink-0 items-center">
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: p.color ?? 'var(--foreground)' }}
              />
            </span>
            <span className="text-left text-muted-foreground">{p.name ?? 'value'}</span>
            <span className="ml-auto text-right font-medium">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
