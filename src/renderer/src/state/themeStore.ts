import { create } from 'zustand'

/** User's stored preference. `system` follows the OS appearance live. */
export type ThemePref = 'system' | 'light' | 'dark'

const STORAGE_KEY = 'theme'

function readInitialPref(): ThemePref {
  if (typeof window === 'undefined') return 'system'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'system' || stored === 'light' || stored === 'dark') return stored
  // First run — default to system. (No migration needed: the previous
  // values 'light'/'dark' are still valid here.)
  return 'system'
}

interface ThemeState {
  pref: ThemePref
  setPref: (p: ThemePref) => void
  /** Cycle system → light → dark → system. Used by the sidebar toggle. */
  cyclePref: () => void
}

const NEXT: Record<ThemePref, ThemePref> = {
  system: 'light',
  light: 'dark',
  dark: 'system'
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  pref: readInitialPref(),
  setPref: (pref) => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, pref)
    }
    set({ pref })
  },
  cyclePref: () => {
    const next = NEXT[get().pref]
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next)
    }
    set({ pref: next })
  }
}))
