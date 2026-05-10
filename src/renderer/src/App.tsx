import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { LoadingOverlay } from './components/LoadingOverlay'
import { router } from './routes'
import { useConfigStore } from './state/configStore'
import { useDataStore } from './state/dataStore'
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

  // Once config is hydrated, drive the data store off the path's
  // validity. Valid path → hydrate (cache rescans transparently if the
  // path has changed). Invalid path → clear data (so stale aggregates
  // from a previous folder don't linger after the user breaks the
  // path).
  useEffect(() => {
    if (!configHydrated) return
    if (configValid) {
      void hydrateData()
    } else {
      clearData()
    }
  }, [configHydrated, configValid, hydrateData, clearData])

  return (
    <>
      <RouterProvider router={router} />
      {dataLoading && <LoadingOverlay />}
    </>
  )
}

export default App
