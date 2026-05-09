import { create } from 'zustand'

/** Two modes for the same overlay surface — shares input, list and chrome. */
export type PaletteMode = 'command' | 'search'

interface PaletteState {
  open: boolean
  mode: PaletteMode
  /** Set both at once (the most common entry point — e.g. sidebar Search button). */
  openWith: (mode: PaletteMode) => void
  setOpen: (open: boolean) => void
  /** Toggle visibility, optionally forcing a mode when opening. */
  toggle: (mode?: PaletteMode) => void
  setMode: (mode: PaletteMode) => void
}

export const usePaletteStore = create<PaletteState>((set, get) => ({
  open: false,
  mode: 'command',
  openWith: (mode) => set({ open: true, mode }),
  setOpen: (open) => set({ open }),
  toggle: (mode) =>
    set(() => {
      const wasOpen = get().open
      return {
        open: !wasOpen,
        // If opening, prefer an explicit mode arg; otherwise default to command.
        mode: !wasOpen ? (mode ?? 'command') : get().mode
      }
    }),
  setMode: (mode) => set({ mode })
}))
