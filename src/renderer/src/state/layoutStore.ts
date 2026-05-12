import { create } from 'zustand'

export const SIDEBAR_DEFAULT_WIDTH = 200
export const SIDEBAR_MIN_WIDTH = 180
export const SIDEBAR_MAX_WIDTH = 320

/** Threshold (px) below which the sidebar auto-collapses when the
 *  user has `autoHideSidebar` enabled (default). Picked so a default
 *  iPhone-frame screenshot at 800px (window min) hides the sidebar but
 *  a typical laptop window keeps it. */
export const SIDEBAR_AUTO_HIDE_BELOW = 900

const STORAGE_KEY = 'sw-sidebar-open'

function readPersistedOpen(): boolean {
  if (typeof window === 'undefined') return true
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (raw === null) return true
    return raw === '1'
  } catch {
    return true
  }
}

function writePersistedOpen(open: boolean): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, open ? '1' : '0')
  } catch {
    // ignore — storage unavailable, fall back to in-memory state.
  }
}

interface LayoutState {
  sidebarOpen: boolean
  sidebarWidth: number
  /** Transient hover state — when true and `sidebarOpen` is false, the
   *  sidebar renders in its open transform without flipping the persisted
   *  open flag. Pointerleave on the sidebar clears it; clicking inside
   *  promotes peek → locked via setSidebarOpen(true). */
  peekActive: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void
  setSidebarWidth: (width: number) => void
  setPeek: (next: boolean) => void
}

export const useLayoutStore = create<LayoutState>((set) => ({
  sidebarOpen: readPersistedOpen(),
  sidebarWidth: SIDEBAR_DEFAULT_WIDTH,
  peekActive: false,
  setSidebarOpen: (open) => {
    writePersistedOpen(open)
    set({ sidebarOpen: open, peekActive: false })
  },
  toggleSidebar: () =>
    set((state) => {
      const next = !state.sidebarOpen
      writePersistedOpen(next)
      return { sidebarOpen: next, peekActive: false }
    }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setPeek: (next) => set({ peekActive: next })
}))
