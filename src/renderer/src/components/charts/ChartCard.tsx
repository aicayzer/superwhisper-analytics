import { Card } from '@renderer/components/ui/card'
import { cn } from '@renderer/lib/cn'
import { Maximize2 } from 'lucide-react'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'

interface ChartCardProps {
  /** Heading text. */
  title: string
  /** Slug for the full-screen route at /chart/:slug. Omit to disable maximise. */
  slug?: string
  /** Wraps a chart that fills its container. */
  children: ReactNode
  /** Additional classes for the outer Card. */
  className?: string
  /** Override the inner content padding. */
  bodyClassName?: string
}

/**
 * Standard wrapper for a chart in a card. Title row + maximise affordance,
 * chart fills the rest. The maximise link points at /chart/:slug, which is
 * rendered by ChartView with a back button + breadcrumb.
 *
 * Used everywhere we'd otherwise repeat
 *   <Card><h3>...</h3><div className="flex-1">{chart}</div></Card>.
 */
export function ChartCard({
  title,
  slug,
  children,
  className,
  bodyClassName
}: ChartCardProps): React.JSX.Element {
  const location = useLocation()
  const fromHere = encodeURIComponent(location.pathname + location.search)
  return (
    <Card className={cn('group flex flex-col px-4 pt-3 pb-1.5', className)}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="truncate text-[13px] font-semibold tracking-tight text-foreground">
          {title}
        </h3>
        {slug && (
          <Link
            to={`/chart/${slug}?from=${fromHere}`}
            aria-label={`Open ${title} full screen`}
            title="Open full screen"
            className="rounded p-1 text-muted-foreground/60 opacity-0 transition-opacity hover:bg-foreground/5 hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring/40"
          >
            <Maximize2 className="h-3 w-3" strokeWidth={1.8} />
          </Link>
        )}
      </div>
      <div className={cn('min-h-0 flex-1', bodyClassName)}>{children}</div>
    </Card>
  )
}
