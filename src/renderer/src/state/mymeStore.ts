import { create } from 'zustand'
import type { MymeMapping, MymeStatus, ProbeResult, TypeSummary } from '../../../preload/api'

/**
 * Renderer mirror of the Myme integration's sync-engine status.
 *
 * Hydrated once via `window.api.myme.status()` on first use, then kept
 * fresh by the `myme:status` push channel. The card subscribes to this
 * store and renders the four card-states (disconnected / connecting /
 * connected{,-with-error} / syncing) directly off the discriminated
 * union. The fifth state — `disabled` — is composed in the card from
 * `configStore.demoMode` + `configStore.path`; main doesn't know about
 * it.
 *
 * The action wrappers (`connect`, `disconnect`, `syncNow`, `setEndpoint`)
 * thread results back into the store optimistically. The push channel
 * remains the canonical source of truth — it catches state transitions
 * the round-trip doesn't (e.g. device-flow approval landing in the
 * background).
 *
 * The mapping / type-list / mode-filter slice is read-on-demand:
 * mapping hydrates alongside the initial status, type list refreshes
 * on explicit call (the picker UI), mode filter mirrors persisted
 * config.
 */

interface MymeState {
  status: MymeStatus | null
  hydrated: boolean
  mapping: MymeMapping | null
  modeFilter: string[] | null
  typeList: TypeSummary[] | null
  typeListLoading: boolean
  hydrate: () => Promise<void>
  setEndpoint: (url: string) => Promise<void>
  connect: () => Promise<void>
  useApiKey: () => Promise<void>
  cancelConnect: () => Promise<void>
  submitApiKey: (key: string) => Promise<void>
  disconnect: () => Promise<void>
  syncNow: () => Promise<void>
  testSync: () => Promise<void>
  cancelSync: () => Promise<void>
  purgeAllData: () => Promise<
    { ok: true; recordings: number; sessions: number } | { ok: false; error: string }
  >
  refreshMapping: () => Promise<void>
  setMapping: (mapping: MymeMapping) => Promise<void>
  refreshModeFilter: () => Promise<void>
  setModeFilter: (modes: string[] | null) => Promise<void>
  refreshTypeList: () => Promise<void>
  probeConnection: () => Promise<ProbeResult>
  registerType: (schema: unknown) => Promise<unknown>
}

export const useMymeStore = create<MymeState>((set, get) => ({
  status: null,
  hydrated: false,
  mapping: null,
  modeFilter: null,
  typeList: null,
  typeListLoading: false,

  hydrate: async () => {
    if (get().hydrated) return
    const [initial, mapping, modeFilter] = await Promise.all([
      window.api.myme.status(),
      window.api.myme.getMapping(),
      window.api.myme.getModeFilter()
    ])
    set({ status: initial, mapping, modeFilter, hydrated: true })
    // Subscribe to push updates. The store is a singleton in the
    // renderer, so we leak no handlers on hot-reload — the IPC channel
    // is one-per-window and tears down with the window.
    window.api.myme.onStatus((next) => set({ status: next }))
  },

  setEndpoint: async (url) => {
    const next = await window.api.myme.setEndpoint(url)
    set({ status: next })
  },

  connect: async () => {
    const next = await window.api.myme.connect()
    set({ status: next })
  },

  useApiKey: async () => {
    const next = await window.api.myme.useApiKey()
    set({ status: next })
  },

  cancelConnect: async () => {
    const next = await window.api.myme.cancelConnect()
    set({ status: next })
  },

  submitApiKey: async (key) => {
    const next = await window.api.myme.submitApiKey(key)
    set({ status: next })
  },

  disconnect: async () => {
    const next = await window.api.myme.disconnect()
    set({ status: next })
  },

  syncNow: async () => {
    const next = await window.api.myme.syncNow()
    set({ status: next })
  },

  testSync: async () => {
    const next = await window.api.myme.testSync()
    set({ status: next })
  },

  cancelSync: async () => {
    const next = await window.api.myme.cancelSync()
    set({ status: next })
  },

  purgeAllData: async () => {
    return await window.api.myme.purgeAllData()
  },

  refreshMapping: async () => {
    const mapping = await window.api.myme.getMapping()
    set({ mapping })
  },

  setMapping: async (mapping) => {
    const persisted = await window.api.myme.setMapping(mapping)
    set({ mapping: persisted })
  },

  refreshModeFilter: async () => {
    const modeFilter = await window.api.myme.getModeFilter()
    set({ modeFilter })
  },

  setModeFilter: async (modes) => {
    const persisted = await window.api.myme.setModeFilter(modes)
    set({ modeFilter: persisted })
  },

  refreshTypeList: async () => {
    set({ typeListLoading: true })
    try {
      const types = await window.api.myme.listTypes()
      set({ typeList: types, typeListLoading: false })
    } catch {
      set({ typeListLoading: false })
    }
  },

  probeConnection: async () => {
    return await window.api.myme.probeConnection()
  },

  registerType: async (schema) => {
    return await window.api.myme.registerType(schema)
  }
}))
