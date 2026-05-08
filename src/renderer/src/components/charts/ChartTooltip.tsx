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
          <div key={i} className="flex items-center gap-2 tabular-nums">
            <span
              aria-hidden
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: p.color ?? 'var(--foreground)' }}
            />
            <span className="text-muted-foreground">{p.name ?? 'value'}</span>
            <span className="ml-auto font-medium">{p.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
