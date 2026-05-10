import { create } from 'zustand'

/**
 * Small "persisted UI preferences" store. Anything that needs to survive
 * reloads and isn't part of the canonical config (paths, dictionaries) goes
 * here. Today it just holds the transcript view-mode; future prefs (e.g.
 * default sort) can extend the same shape.
 *
 * Persistence is a hand-rolled `localStorage.setItem` rather than
 * zustand/middleware/persist — keeps the bundle lean and the schema visible.
 */

export type TranscriptViewMode = 'block' | 'inline'

const STORAGE_KEY = 'ui.prefs.v1'

interface PersistedPrefs {
  transcriptViewMode: TranscriptViewMode
}

const DEFAULTS: PersistedPrefs = {
  transcriptViewMode: 'block'
}

function readInitial(): PersistedPrefs {
  if (typeof window === 'undefined') return DEFAULTS
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    const parsed = JSON.parse(raw) as Partial<PersistedPrefs>
    return {
      transcriptViewMode:
        parsed.transcriptViewMode === 'inline' || parsed.transcriptViewMode === 'block'
          ? parsed.transcriptViewMode
          : DEFAULTS.transcriptViewMode
    }
  } catch {
    return DEFAULTS
  }
}

function persist(state: PersistedPrefs): void {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* storage unavailable — in-memory state still works */
  }
}

interface UiPrefsState extends PersistedPrefs {
  setTranscriptViewMode: (mode: TranscriptViewMode) => void
}

export const useUiPrefsStore = create<UiPrefsState>((set, get) => ({
  ...readInitial(),
  setTranscriptViewMode: (transcriptViewMode) => {
    persist({ ...get(), transcriptViewMode })
    set({ transcriptViewMode })
  }
}))
