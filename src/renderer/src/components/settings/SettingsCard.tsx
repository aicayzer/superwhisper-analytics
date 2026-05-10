import { cn } from '@renderer/lib/cn'
import type { LucideIcon } from 'lucide-react'

interface SettingsCardProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  /** Right-aligned chrome shown in the card header row (e.g. status pill). */
  headerExtra?: React.ReactNode
  children: React.ReactNode
  className?: string
}

/**
 * Section wrapper used across the Settings page.
 *
 *   ┌──────────────────────────────────────────────────┐
 *   │ [▢]  Title                          (headerExtra)│
 *   │      Subtitle                                    │
 *   ├──────────────────────────────────────────────────┤
 *   │ <children>                                       │
 *   └──────────────────────────────────────────────────┘
 *
 * The header row carries the icon-in-square, title, and a subtitle line.
 * `headerExtra` slots into the top-right — used for the "All recordings
 * indexed" status pill on Recordings folder. The body sits below a thin
 * divider so the row reads like a real settings panel rather than a
 * loose stack of headings.
 */
export function SettingsCard({
  icon: Icon,
  title,
  subtitle,
  headerExtra,
  children,
  className
}: SettingsCardProps): React.JSX.Element {
  return (
    <section
      className={cn(
        'overflow-hidden rounded-xl border border-border bg-card',
        'shadow-[0_1px_2px_rgba(0,0,0,0.03)]',
        className
      )}
    >
      <header className="flex items-start gap-3 px-5 py-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-foreground/[0.05]">
          <Icon className="h-4 w-4 text-foreground" strokeWidth={1.7} />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-[14px] font-semibold leading-tight text-foreground">{title}</h2>
          {subtitle && (
            <p className="mt-0.5 text-[12.5px] leading-tight text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {headerExtra && <div className="shrink-0">{headerExtra}</div>}
      </header>
      <div className="border-t border-border px-5 py-4">{children}</div>
    </section>
  )
}
