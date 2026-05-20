import { useEffect, useRef } from 'react'
import { RouterProvider } from 'react-router-dom'
import { LoadingOverlay } from './components/LoadingOverlay'
import { Toaster } from './components/ui/sonner'
import { toastError } from './lib/toast'
import { router } from './routes'
import { useConfigStore } from './state/configStore'
import { useDataStore } from './state/dataStore'
import { useMymeStore } from './state/mymeStore'
import { useThemeStore } from './state/themeStore'

/**
 * Bridges the user's theme preference to the actual `.dark` class on <html>.
 * Effective theme is derived from `pref` + system media query — when `pref`
 * is "system", the class flips live as the OS appearance changes.
 */
function App(): React.JSX.Element {
  const pref = useThemeStore((s) => s.pref)
  const hydrateConfig = useConfigStore((s) => s.hydrate)
  const configHydrated = useConfigStore((s) => s.hydrated)
  const configValid = useConfigStore((s) => s.isValid)
  const hydrateData = useDataStore((s) => s.hydrate)
  const clearData = useDataStore((s) => s.clearData)
  const dataLoading = useDataStore((s) => s.loading)
  const hydrateMyme = useMymeStore((s) => s.hydrate)
  const mymeStatus = useMymeStore((s) => s.status)
  // Track the most-recent error string we've already surfaced so we
  // only toast on transitions, not on every render. A null entry means
  // the next non-null error is a fresh transition worth toasting.
  const lastToastedErrorRef = useRef<string | null>(null)

  // Surface auth + sync errors via a system-level toast in addition to
  // the inline state on the ConnectionCard. The card carries the full
  // explanation; the toast is the one-shot heads-up so a background
  // failure can't go unnoticed when the user is on another screen.
  //
  // Only fires when the error *string* changes — re-renders that
  // re-emit the same error are coalesced. Cleared whenever the error
  // goes away so the next occurrence triggers again.
  useEffect(() => {
    if (!mymeStatus) return
    const error =
      mymeStatus.kind === 'disconnected' || mymeStatus.kind === 'connected'
        ? (mymeStatus.lastError ?? null)
        : null

    if (error === null) {
      lastToastedErrorRef.current = null
      return
    }
    if (lastToastedErrorRef.current === error) return
    lastToastedErrorRef.current = error

    const message = mymeStatus.kind === 'disconnected' ? 'Sign-in failed' : 'Last sync failed'
    toastError({ message, copyText: error })
  }, [mymeStatus])

  useEffect(() => {
    const mq =
      typeof window !== 'undefined' ? window.matchMedia('(prefers-color-scheme: dark)') : null

    const apply = (): void => {
      const systemDark = mq?.matches ?? false
      const isDark = pref === 'dark' || (pref === 'system' && systemDark)
      document.documentElement.classList.toggle('dark', isDark)
    }

    apply()

    if (pref !== 'system' || !mq) return undefined
    mq.addEventListener('change', apply)
    return () => mq.removeEventListener('change', apply)
  }, [pref])

  // Pull the persisted config from main on mount. The store handles
  // auto-adopting the auto-detected path if nothing is saved yet.
  useEffect(() => {
    void hydrateConfig()
  }, [hydrateConfig])

  // Pull Myme integration state once on mount — the store's `hydrated`
  // flag makes this a no-op if it's already run. Without this, every
  // Sync-tab consumer (ConnectionCard, PipelineCard)
  // sees `status: null` indefinitely and renders its loading state.
  useEffect(() => {
    void hydrateMyme()
  }, [hydrateMyme])

  // Once config is hydrated, ask main for data. Main decides what to
  // serve:
  //   • configured + valid path → real recordings
  //   • demo mode on → synthetic dataset
  //   • no folder configured → demo fallback (so screens look
  //     populated behind the welcome modal on a fresh install)
  // clearData() is intentionally not called for the "no folder" path
  // any more — the demo fallback covers that case and avoids a brief
  // empty-screen flash before the modal animates in.
  useEffect(() => {
    if (!configHydrated) return
    void hydrateData()
    // `clearData` is referenced here purely so React's lint rule for
    // exhaustive deps stays happy when other branches re-introduce it.
    void clearData
  }, [configHydrated, configValid, hydrateData, clearData])

  // Subscribe to fs.watch invalidation pushes from main — when the user
  // has the watch-folder toggle on and SuperWhisper writes a new
  // recording, main reindexes and pushes a fresh payload. The dataStore
  // setState slots it straight into the running app.
  useEffect(() => {
    const unsubscribe = window.api.data.onInvalidated((payload) => {
      useDataStore.setState({
        aggregates: payload.aggregates,
        recordings: payload.recordings,
        indexedAt: payload.indexedAt || null,
        count: payload.count,
        error: payload.error
      })
    })
    return unsubscribe
  }, [])

  return (
    <>
      <RouterProvider router={router} />
      {/* LoadingOverlay only covers the screen for real-data scans
          (configured + valid path). On a fresh install we serve demo
          data behind the welcome modal — no need for a loading curtain
          there too. */}
      {configValid && dataLoading && <LoadingOverlay />}
      <Toaster />
    </>
  )
}

export default App
