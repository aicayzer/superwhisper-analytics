import { create } from 'zustand'
import { emptyAggregates } from '@shared/empty-aggregates'
import type { Aggregates, HydratePayload, Recording } from '@shared/types'

/**
 * Renderer mirror of the main-process recording cache.
 *
 * Hydrated once on app start (or after a path change) via
 * `window.api.data.hydrate()`. The store keeps the full `Aggregates`
 * bundle as a single field so:
 *
 *   • the range-aware `useFilteredAggregates()` hook can return the
 *     same shape after filtering, and screens swap their selector
 *     without changing the consumer code, and
 *   • when `range === all` the hook returns this precomputed bundle
 *     directly — no renderer-side recompute.
 *
 * `loading` is set during full hydrates (initial load, post path
 * change). `reindexing` is set only during the user-triggered reindex
 * — Settings shows a status update; no full-screen overlay.
 */

interface DataState {
  recordings: Recording[]
  /** Aggregates computed in main against the full recording set. The
   *  range-aware hook layers a filtered recompute on top of this when
   *  the user picks a window. */
  aggregates: Aggregates
  loading: boolean
  reindexing: boolean
  error: string | null
  indexedAt: string | null
  count: number
  /** Per-scan diagnostics from main. `scanErrors` counts folders whose
   *  meta.json failed to parse; `scanSkipped` counts folders without a
   *  meta.json. Surfaced in Settings → Recordings folder. */
  scanErrors: number
  scanSkipped: number

  /** Pull data from main. Sets loading; clears it on completion. */
  hydrate: () => Promise<void>
  /** User-triggered rescan. Doesn't gate the overlay; sets reindexing. */
  reindex: () => Promise<void>
  /** Reset to empty (e.g. when the configured path becomes invalid). */
  clearData: () => void
}

const INITIAL_STATE = {
  recordings: [] as Recording[],
  aggregates: emptyAggregates(),
  loading: false,
  reindexing: false,
  error: null as string | null,
  indexedAt: null as string | null,
  count: 0,
  scanErrors: 0,
  scanSkipped: 0
}

function applyPayload(payload: HydratePayload): Partial<DataState> {
  return {
    aggregates: payload.aggregates,
    recordings: payload.recordings,
    indexedAt: payload.indexedAt || null,
    count: payload.count,
    error: payload.error,
    scanErrors: payload.scanErrors,
    scanSkipped: payload.scanSkipped
  }
}

export const useDataStore = create<DataState>((set) => ({
  ...INITIAL_STATE,

  hydrate: async () => {
    set({ loading: true, error: null })
    try {
      const payload = await window.api.data.hydrate()
      set({ ...applyPayload(payload), loading: false })
    } catch (err) {
      console.error('[dataStore] hydrate failed', err)
      set({ loading: false, error: 'Failed to hydrate recordings.' })
    }
  },

  reindex: async () => {
    set({ reindexing: true, error: null })
    try {
      const payload = await window.api.data.reindex()
      set({ ...applyPayload(payload), reindexing: false })
    } catch (err) {
      console.error('[dataStore] reindex failed', err)
      set({ reindexing: false, error: 'Reindex failed.' })
    }
  },

  clearData: () => set({ ...INITIAL_STATE, aggregates: emptyAggregates() })
}))
