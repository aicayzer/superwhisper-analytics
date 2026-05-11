import { ipcRenderer } from 'electron'
import type { HydratePayload } from '@shared/types'

/**
 * Single source of truth for the renderer ↔ main IPC surface.
 *
 * Add a new IPC channel here, in `src/main/ipc.ts`, and the renderer
 * picks up the typed call automatically via `window.api.*`.
 */

/**
 * Persisted user config. Mirrors `<userData>/config.json`.
 *
 * `superwhisperPath` is the absolute path to the recordings folder
 * itself (not its parent). `null` until the user (or auto-detect) picks.
 *
 * `fillerWords` is the active list of conversational filler phrases used
 * by the analytics. Editable from Settings → Dictionary; falls back to
 * `DEFAULT_FILLER_PHRASES` when absent (older configs migrate
 * transparently on first read).
 *
 * `watchFolder` toggles the main-process fs.watch on the recordings
 * folder — when on, new recordings auto-trigger a reindex.
 *
 * `transcriptsOnly` hides the audio player + waveform from
 * TranscriptDetail when on. The on-disk WAVs are untouched; this is a
 * renderer-side preference only.
 */
export interface Config {
  superwhisperPath: string | null
  fillerWords: string[]
  watchFolder: boolean
  transcriptsOnly: boolean
  /** When true, the app feeds the renderer a deterministic synthetic
   *  dataset instead of scanning the real recordings folder. Used for
   *  demos and screenshots. */
  demoMode: boolean
}

/**
 * Renderer-facing status snapshot. Bundles the persisted config with
 * derived facts (`isValid`, `defaultPath`) so a single round-trip is
 * enough to render Settings or decide whether to show the first-run
 * modal.
 */
export interface ConfigStatus {
  /** Currently configured recordings path (null if unset). */
  path: string | null
  /** True if `path` exists and at least one child has a meta.json. */
  isValid: boolean
  /** True if `path` resolves under the user's home directory. Soft
   *  warning — false means Settings surfaces a heads-up but the path
   *  is still used. */
  isInsideHome: boolean
  /** Auto-detected default, or null if no candidate exists on disk. */
  defaultPath: string | null
  /** Active filler-phrase list. */
  fillerWords: string[]
  watchFolder: boolean
  transcriptsOnly: boolean
  demoMode: boolean
}

/** Wire callback type for main → renderer push when the indexed dataset
 *  invalidates (today: fs.watch debounce on the recordings folder). */
type Unsubscribe = () => void

export const api = {
  config: {
    status: (): Promise<ConfigStatus> => ipcRenderer.invoke('config:status'),
    setPath: (path: string | null): Promise<ConfigStatus> =>
      ipcRenderer.invoke('config:setPath', path),
    /** Toggle the fs.watch on the recordings folder. Main starts/stops the
     *  watcher accordingly. */
    setWatchFolder: (enabled: boolean): Promise<ConfigStatus> =>
      ipcRenderer.invoke('config:setWatchFolder', enabled),
    /** Toggle the renderer-side "hide audio UI" preference. */
    setTranscriptsOnly: (enabled: boolean): Promise<ConfigStatus> =>
      ipcRenderer.invoke('config:setTranscriptsOnly', enabled),
    /** Toggle demo mode. Triggers a fresh hydrate so the renderer's
     *  dataset swaps in/out without a reload. */
    setDemoMode: (enabled: boolean): Promise<ConfigStatus> =>
      ipcRenderer.invoke('config:setDemoMode', enabled)
  },
  data: {
    hydrate: (): Promise<HydratePayload> => ipcRenderer.invoke('data:hydrate'),
    reindex: (): Promise<HydratePayload> => ipcRenderer.invoke('data:reindex'),
    /**
     * Replace the active filler-phrase list and re-derive aggregates.
     * Resolves to a fresh HydratePayload — no separate hydrate call needed.
     */
    setFillerWords: (words: string[]): Promise<HydratePayload> =>
      ipcRenderer.invoke('data:setFillerWords', words),
    /**
     * Subscribe to main-process invalidation pushes. Fires whenever the
     * watch-folder picks up a new recording. Returns an unsubscribe
     * function — register on dataStore init so a fresh HydratePayload
     * lands in the renderer the moment a recording is created.
     */
    onInvalidated: (handler: (payload: HydratePayload) => void): Unsubscribe => {
      const listener = (_e: unknown, payload: HydratePayload): void => handler(payload)
      ipcRenderer.on('data:invalidated', listener)
      return () => ipcRenderer.removeListener('data:invalidated', listener)
    }
  },
  dialog: {
    pickFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickFolder')
  },
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url)
}

export type Api = typeof api
