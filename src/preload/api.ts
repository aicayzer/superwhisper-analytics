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
 */
export interface Config {
  superwhisperPath: string | null
  fillerWords: string[]
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
  /** Auto-detected default, or null if no candidate exists on disk. */
  defaultPath: string | null
  /** Active filler-phrase list. */
  fillerWords: string[]
}

export const api = {
  config: {
    status: (): Promise<ConfigStatus> => ipcRenderer.invoke('config:status'),
    setPath: (path: string | null): Promise<ConfigStatus> =>
      ipcRenderer.invoke('config:setPath', path)
  },
  data: {
    hydrate: (): Promise<HydratePayload> => ipcRenderer.invoke('data:hydrate'),
    reindex: (): Promise<HydratePayload> => ipcRenderer.invoke('data:reindex'),
    /**
     * Replace the active filler-phrase list and re-derive aggregates.
     * Resolves to a fresh HydratePayload — no separate hydrate call needed.
     */
    setFillerWords: (words: string[]): Promise<HydratePayload> =>
      ipcRenderer.invoke('data:setFillerWords', words)
  },
  dialog: {
    pickFolder: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickFolder')
  },
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url)
}

export type Api = typeof api
