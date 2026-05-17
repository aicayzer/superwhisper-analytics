import { create } from 'zustand'
import type { MymeStatus } from '../../../preload/api'

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
 */

interface MymeState {
  status: MymeStatus | null
  hydrated: boolean
  hydrate: () => Promise<void>
  setEndpoint: (url: string) => Promise<void>
  setSyncLimit: (n: number) => Promise<void>
  connect: () => Promise<void>
  useApiKey: () => Promise<void>
  cancelConnect: () => Promise<void>
  submitApiKey: (key: string) => Promise<void>
  disconnect: () => Promise<void>
  syncNow: () => Promise<void>
  cancelSync: () => Promise<void>
}

export const useMymeStore = create<MymeState>((set, get) => ({
  status: null,
  hydrated: false,

  hydrate: async () => {
    if (get().hydrated) return
    const initial = await window.api.myme.status()
    set({ status: initial, hydrated: true })
    // Subscribe to push updates. The store is a singleton in the
    // renderer, so we leak no handlers on hot-reload — the IPC channel
    // is one-per-window and tears down with the window.
    window.api.myme.onStatus((next) => set({ status: next }))
  },

  setEndpoint: async (url) => {
    const next = await window.api.myme.setEndpoint(url)
    set({ status: next })
  },

  setSyncLimit: async (n) => {
    const next = await window.api.myme.setSyncLimit(n)
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

  cancelSync: async () => {
    const next = await window.api.myme.cancelSync()
    set({ status: next })
  }
}))
