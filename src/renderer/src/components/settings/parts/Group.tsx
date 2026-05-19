interface GroupProps {
  /** Small-caps section header. Optional — when omitted, the group
   *  renders without a header row. */
  label?: string
  /** Right-aligned hint (e.g. "10 of 12 on"). Tabular nums. */
  hint?: React.ReactNode
  /** Children sit inside a bordered, rounded surface. Rows inside should
   *  use first/last-child styling for top/bottom radius — `Group`'s
   *  `overflow-hidden` will clip them anyway. */
  children: React.ReactNode
  className?: string
}

/**
 * Section grouping primitive. Used by the new Sync tab to lay out rows
 * (destination, fields, source) inside bordered cards with optional
 * small-caps headers. The visual rhythm matches macOS System Settings —
 * mid-grey label above a single rounded surface.
 *
 *   GROUP LABEL                      hint?
 *   ┌────────────────────────────┐
 *   │ row                        │
 *   │ row                        │
 *   └────────────────────────────┘
 */
export function Group({ label, hint, children, className }: GroupProps): React.JSX.Element {
  return (
    <div className={className}>
      {(label || hint) && (
        <div className="mb-2 flex items-baseline justify-between px-1">
          {label && (
            <span className="text-[10.5px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {label}
            </span>
          )}
          {hint && <span className="text-[11.5px] tabular-nums text-muted-foreground">{hint}</span>}
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-border bg-card">{children}</div>
    </div>
  )
}
