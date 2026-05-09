import { Link, useParams } from 'react-router-dom'
import { CHART_REGISTRY } from './chartRegistry'

/**
 * Full-screen chart view at /chart/:slug. Reads the chart spec from the
 * registry and renders it in a single bordered panel. The breadcrumb in
 * MainHeader (e.g. "Language › Speaking pace") plus the back arrow
 * already convey the source — no extra footer needed.
 */
export function ChartView(): React.JSX.Element {
  const { slug } = useParams<{ slug: string }>()
  const spec = slug ? CHART_REGISTRY[slug] : undefined

  if (!spec) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-12 text-center">
        <div className="text-xl font-semibold text-foreground">Chart not found</div>
        <Link to="/" className="text-[13px] text-muted-foreground hover:underline">
          Back to Overview
        </Link>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col gap-3">
      {spec.description && (
        <p className="text-[12.5px] text-muted-foreground">{spec.description}</p>
      )}
      <div className="min-h-0 flex-1 rounded-xl border border-border bg-card p-4">
        <div className="h-full">{spec.render()}</div>
      </div>
    </div>
  )
}
