import { create } from 'zustand'
import { emptyAggregates } from '@shared/empty-aggregates'
import type { Aggregates, HydratePayload, Recording } from '@shared/types'

/**
 * Renderer mirror of the main-process recording cache.
 *
 * Hydrated once on app start (or after a path change) via
 * `window.api.data.hydrate()`. The store flattens every aggregate
 * onto the top level so screens can do `useDataStore(s => s.overview)`
 * — the same shape the legacy `mock` object exposed, so swapping
 * mock.X → useDataStore-selector is one-line per consumer.
 *
 * `loading` is set during full hydrates (initial load, post path
 * change). `reindexing` is set only during the user-triggered reindex
 * — Settings shows a status update; no full-screen overlay.
 */

interface DataState extends Aggregates {
  recordings: Recording[]
  loading: boolean
  reindexing: boolean
  error: string | null
  indexedAt: string | null
  count: number

  /** Pull data from main. Sets loading; clears it on completion. */
  hydrate: () => Promise<void>
  /** User-triggered rescan. Doesn't gate the overlay; sets reindexing. */
  reindex: () => Promise<void>
  /** Reset to empty (e.g. when the configured path becomes invalid). */
  clearData: () => void
}

const empty = emptyAggregates()

const INITIAL_STATE = {
  ...empty,
  recordings: [] as Recording[],
  loading: false,
  reindexing: false,
  error: null as string | null,
  indexedAt: null as string | null,
  count: 0
}

function applyPayload(payload: HydratePayload): Partial<DataState> {
  return {
    ...payload.aggregates,
    recordings: payload.recordings,
    indexedAt: payload.indexedAt || null,
    count: payload.count,
    error: payload.error
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

  clearData: () => set({ ...INITIAL_STATE })
}))
