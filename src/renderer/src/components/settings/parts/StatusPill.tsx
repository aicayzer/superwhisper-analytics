import { cn } from '@renderer/lib/cn'
import { Check, CircleAlert, Loader2 } from 'lucide-react'

export type StatusTone = 'ok' | 'busy' | 'error' | 'neutral'

interface StatusPillProps {
  tone: StatusTone
  label: string
  /** Optional title text shown on hover — useful for error tones where
   *  the label is truncated. */
  title?: string
  className?: string
}

/**
 * Compact status indicator used in card headers (Connection, Recordings
 * folder). Narrow palette use only — accent-green for healthy,
 * accent-orange for warning/error, neutral grey for everything else.
 * The pill carries an icon by tone so colour alone doesn't carry the
 * meaning.
 */
export function StatusPill({ tone, label, title, className }: StatusPillProps): React.JSX.Element {
  const palette = {
    ok: {
      bg: 'bg-accent-green-bg',
      fg: 'text-accent-green',
      border: 'border-accent-green/30',
      icon: <Check className="h-3 w-3" strokeWidth={2.2} />
    },
    busy: {
      bg: 'bg-foreground/[0.04]',
      fg: 'text-muted-foreground',
      border: 'border-border',
      icon: <Loader2 className="h-3 w-3 animate-spin" strokeWidth={1.8} />
    },
    error: {
      bg: 'bg-accent-orange-bg',
      fg: 'text-accent-orange',
      border: 'border-accent-orange/30',
      icon: <CircleAlert className="h-3 w-3" strokeWidth={1.8} />
    },
    neutral: {
      bg: 'bg-foreground/[0.04]',
      fg: 'text-muted-foreground',
      border: 'border-border',
      icon: null as React.ReactNode
    }
  }[tone]
  return (
    <span
      title={title ?? (tone === 'error' ? label : undefined)}
      className={cn(
        'inline-flex max-w-[18rem] items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11.5px] font-medium',
        palette.bg,
        palette.fg,
        palette.border,
        className
      )}
    >
      {palette.icon}
      <span className="truncate">{label}</span>
    </span>
  )
}
