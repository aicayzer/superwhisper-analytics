import { Loader2 } from 'lucide-react'

/**
 * Full-screen overlay shown while the renderer waits for the initial
 * data hydrate to come back from main. Sits below the first-run modal
 * (z-50 < z-60) so the modal still wins when both would render — that
 * never happens in practice (modal only renders when path is invalid;
 * overlay only renders when path is valid and we're hydrating) but
 * the layering rule keeps the precedence explicit.
 */
export function LoadingOverlay({
  message = 'Loading recordings…'
}: {
  message?: string
}): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center bg-background/85 backdrop-blur-sm">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-floating px-5 py-3 text-[13px] text-muted-foreground shadow-[var(--shadow-float)]">
        <Loader2 className="h-4 w-4 animate-spin" strokeWidth={1.6} />
        {message}
      </div>
    </div>
  )
}
