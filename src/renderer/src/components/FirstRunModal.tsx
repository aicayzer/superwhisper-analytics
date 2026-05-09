import { useConfigStore } from '@renderer/state/configStore'
import { FolderSearch } from 'lucide-react'
import { useState } from 'react'

/**
 * Blocking first-run modal. Surfaces the moment we discover there's no
 * valid SuperWhisper recordings folder configured.
 *
 * Single action — open the native folder picker. Until the user points
 * us at a folder that looks right (`isValid === true` per the cheap
 * meta.json probe in `main/config.ts`) the rest of the app stays
 * inaccessible behind the backdrop.
 */
export function FirstRunModal(): React.JSX.Element {
  const setPath = useConfigStore((s) => s.setPath)
  const [picking, setPicking] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pick(): Promise<void> {
    setPicking(true)
    setError(null)
    try {
      const chosen = await window.api.dialog.pickFolder()
      if (!chosen) return
      await setPath(chosen)
      const stillInvalid = !useConfigStore.getState().isValid
      if (stillInvalid) {
        setError(
          "That folder doesn't look like a SuperWhisper recordings folder. Pick the directory that contains your recording subfolders."
        )
      }
    } finally {
      setPicking(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 backdrop-blur-sm"
      // The whole window above is draggable as the title bar — we don't want
      // the modal moving the window if the user mis-clicks it.
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      role="dialog"
      aria-modal="true"
      aria-labelledby="first-run-title"
    >
      <div className="mx-4 w-full max-w-md rounded-xl border border-border bg-floating p-6 shadow-[var(--shadow-float)]">
        <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-accent-blue-bg text-accent-blue">
          <FolderSearch className="h-5 w-5" strokeWidth={1.6} />
        </div>
        <h1 id="first-run-title" className="mb-1.5 text-base font-semibold text-foreground">
          Find your recordings
        </h1>
        <p className="mb-5 text-[13px] leading-relaxed text-muted-foreground">
          Choose the folder where SuperWhisper stores your recordings. This is usually
          <span className="mx-1 whitespace-nowrap rounded bg-foreground/[0.06] px-1.5 py-px font-mono text-[11.5px]">
            ~/Library/Application Support/com.superduper.superwhisper/recordings
          </span>
          but you can point us anywhere.
        </p>
        {error && (
          <p className="mb-4 rounded-md border border-red-200/60 bg-red-50 px-3 py-2 text-[12px] leading-snug text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </p>
        )}
        <button
          type="button"
          onClick={pick}
          disabled={picking}
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-foreground px-4 text-[13px] font-medium text-background transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-50"
        >
          {picking ? 'Choosing…' : 'Choose folder…'}
        </button>
      </div>
    </div>
  )
}
