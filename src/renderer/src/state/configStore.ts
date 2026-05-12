import { normalisePhrases } from '@shared/text-metrics'
import { create } from 'zustand'
import type { ConfigStatus } from '../../../preload/api'
import { useDataStore } from './dataStore'

/**
 * Renderer mirror of the persisted config + derived facts.
 *
 * Hydrated once on app start from `window.api.config.status()`. The
 * store is the source of truth for the renderer; main is the source of
 * truth for the disk file. They sync whenever a setter is called.
 *
 * If no path is persisted but auto-detect found one, the store
 * silently adopts it on hydrate so users with the standard SuperWhisper
 * install never see the first-run modal.
 */

interface ConfigState {
  /** Currently configured path. `null` until set. */
  path: string | null
  /** Auto-detected default — exposed so "Reset to default" can revert. */
  defaultPath: string | null
  /** Cheap probe: does `path` look like a SuperWhisper recordings folder? */
  isValid: boolean
  /** Soft check: is the configured path under the user's home directory? */
  isInsideHome: boolean
  /** Active filler-phrase list (edited from Settings → Dictionary). */
  fillerWords: string[]
  /** fs.watch on the recordings folder — see main/watcher.ts. */
  watchFolder: boolean
  /** Hide audio + waveform from TranscriptDetail when true. */
  transcriptsOnly: boolean
  /** When true, the app shows a synthetic demo dataset instead of the
   *  real recordings folder. */
  demoMode: boolean
  /** When true, sidebar auto-collapses on narrow windows. */
  autoHideSidebar: boolean
  /** When true, DevTools are open. Persisted across restarts. */
  devTools: boolean
  /** Has the initial round-trip completed? Gates the first-run modal. */
  hydrated: boolean
  /** Transient flag — when true, force the welcome modal regardless
   *  of whether a path is set. Set by `resetApp` so the user can
   *  re-test the onboarding flow on a machine where SuperWhisper is
   *  installed at the default location (which would otherwise be
   *  auto-adopted on the next hydrate). Cleared when the user
   *  completes the welcome flow. Not persisted. */
  welcomeForceShow: boolean

  /** One-shot hydrate; safe to call more than once but only the first does work. */
  hydrate: () => Promise<void>
  /** Persist a new path (or null to clear). Re-runs validity check. */
  setPath: (next: string | null) => Promise<void>
  /** Persist a new filler-phrase list. Triggers a full aggregate
   *  recompute in main and updates dataStore with the fresh payload. */
  setFillerWords: (words: string[]) => Promise<void>
  /** Toggle the recordings-folder watcher. */
  setWatchFolder: (enabled: boolean) => Promise<void>
  /** Toggle the "transcripts only" preference (hide audio UI). */
  setTranscriptsOnly: (enabled: boolean) => Promise<void>
  /** Toggle demo mode + trigger a renderer-side rehydrate. */
  setDemoMode: (enabled: boolean) => Promise<void>
  /** Toggle the auto-hide sidebar behaviour. */
  setAutoHideSidebar: (enabled: boolean) => Promise<void>
  /** Toggle DevTools open/close. Persists across restarts. */
  setDevTools: (enabled: boolean) => Promise<void>
  /** Wipe the persisted config back to defaults and force the welcome
   *  modal to re-appear. Used by Settings → About → Reset app. */
  resetApp: () => Promise<void>
  /** Clear `welcomeForceShow` — call this from the welcome modal
   *  after the user has picked a path or opted into demo. */
  dismissWelcomeForce: () => void
}

function applyStatus(status: ConfigStatus): Partial<ConfigState> {
  return {
    path: status.path,
    defaultPath: status.defaultPath,
    isValid: status.isValid,
    isInsideHome: status.isInsideHome,
    fillerWords: status.fillerWords,
    watchFolder: status.watchFolder,
    transcriptsOnly: status.transcriptsOnly,
    demoMode: status.demoMode,
    autoHideSidebar: status.autoHideSidebar,
    devTools: status.devTools,
    hydrated: true
  }
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  path: null,
  defaultPath: null,
  isValid: false,
  isInsideHome: true,
  fillerWords: [],
  watchFolder: false,
  transcriptsOnly: false,
  demoMode: false,
  autoHideSidebar: true,
  devTools: false,
  hydrated: false,
  welcomeForceShow: false,

  hydrate: async () => {
    if (get().hydrated) return
    const status = await window.api.config.status()
    // Auto-adopt the detected default if nothing is persisted yet — saves
    // the user a click on the standard SuperWhisper install. Persisting
    // also pins the path so a future SuperWhisper move doesn't silently
    // re-detect a different folder.
    if (!status.path && status.defaultPath) {
      const updated = await window.api.config.setPath(status.defaultPath)
      set(applyStatus(updated))
      return
    }
    set(applyStatus(status))
  },

  setPath: async (next) => {
    const updated = await window.api.config.setPath(next)
    set(applyStatus(updated))
  },

  setFillerWords: async (words) => {
    // Pre-normalise so the optimistic update matches what main will
    // persist — avoids a second round-trip to sync.
    const normalised = normalisePhrases(words)
    set({ fillerWords: normalised })
    const payload = await window.api.data.setFillerWords(normalised)
    useDataStore.setState({
      aggregates: payload.aggregates,
      recordings: payload.recordings,
      indexedAt: payload.indexedAt || null,
      count: payload.count,
      error: payload.error
    })
  },

  setWatchFolder: async (enabled) => {
    set({ watchFolder: enabled })
    const updated = await window.api.config.setWatchFolder(enabled)
    set(applyStatus(updated))
  },

  setTranscriptsOnly: async (enabled) => {
    set({ transcriptsOnly: enabled })
    const updated = await window.api.config.setTranscriptsOnly(enabled)
    set(applyStatus(updated))
  },

  setDemoMode: async (enabled) => {
    // Optimistic flip so the toggle responds instantly while main swaps
    // the underlying dataset. Real status arrives on the next line.
    set({ demoMode: enabled })
    const updated = await window.api.config.setDemoMode(enabled)
    set(applyStatus(updated))
    // Force a fresh hydrate so the renderer's dataStore picks up the
    // new dataset — main has the new payload ready by now.
    await useDataStore.getState().hydrate()
  },

  setAutoHideSidebar: async (enabled) => {
    set({ autoHideSidebar: enabled })
    const updated = await window.api.config.setAutoHideSidebar(enabled)
    set(applyStatus(updated))
  },

  setDevTools: async (enabled) => {
    set({ devTools: enabled })
    const updated = await window.api.config.setDevTools(enabled)
    set(applyStatus(updated))
  },

  resetApp: async () => {
    const status = await window.api.config.reset()
    // Apply the cleared status AND flip the force-show flag so the
    // welcome modal renders even when a SuperWhisper folder is
    // detected at the default location (which the modal then surfaces
    // as a Recommended option). Without the flag, the welcome would
    // be skipped for users with SuperWhisper installed.
    set({ ...applyStatus(status), welcomeForceShow: true })
    // Refresh data so the renderer drops the previously-cached scan
    // and falls back to the demo dataset behind the welcome modal.
    await useDataStore.getState().hydrate()
  },

  dismissWelcomeForce: () => set({ welcomeForceShow: false })
}))
