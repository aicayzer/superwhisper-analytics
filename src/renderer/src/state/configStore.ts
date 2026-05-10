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
  /** Active filler-phrase list (edited from Settings → Dictionary). */
  fillerWords: string[]
  /** Has the initial round-trip completed? Gates the first-run modal. */
  hydrated: boolean

  /** One-shot hydrate; safe to call more than once but only the first does work. */
  hydrate: () => Promise<void>
  /** Persist a new path (or null to clear). Re-runs validity check. */
  setPath: (next: string | null) => Promise<void>
  /** Persist a new filler-phrase list. Triggers a full aggregate
   *  recompute in main and updates dataStore with the fresh payload. */
  setFillerWords: (words: string[]) => Promise<void>
}

function applyStatus(status: ConfigStatus): Partial<ConfigState> {
  return {
    path: status.path,
    defaultPath: status.defaultPath,
    isValid: status.isValid,
    fillerWords: status.fillerWords,
    hydrated: true
  }
}

export const useConfigStore = create<ConfigState>((set, get) => ({
  path: null,
  defaultPath: null,
  isValid: false,
  fillerWords: [],
  hydrated: false,

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
  }
}))
