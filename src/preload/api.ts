import { ipcRenderer } from 'electron'
import type { HydratePayload } from '@shared/types'
import type { MymeMapping } from '../main/myme/mapping'

export type { MymeMapping, MappingBinding, FieldMap, SourceFieldRef } from '../main/myme/mapping'

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
  /** When true, the sidebar auto-collapses on narrow windows
   *  (≤900px wide). The user can still open it manually via Cmd-B or the
   *  navbar PanelLeft icon; widening the window again does NOT auto-
   *  expand, so user intent always wins. Default true. */
  autoHideSidebar: boolean
  /** When true, DevTools open on launch. Equivalent to Cmd+Option+I. */
  devTools: boolean
  /** Optional Myme integration settings. The endpoint URL is plain
   *  config; OAuth tokens live in encrypted storage via Electron's
   *  safeStorage, sync state in its own JSON file. */
  myme: {
    endpoint: string
    /** Active mapping config — which Myme type each source kind binds
     *  to, plus the field map for projection. Defaults to the bundled
     *  superwhisper.* types. Older configs without a `mapping` block
     *  default to the bundled mapping on first read. */
    mapping: MymeMapping
    /** Optional Superwhisper-mode filter — recordings whose `modeName`
     *  is in this list are the only ones that sync. `null` = no
     *  filter; empty array is legal but yields zero recordings. */
    modeFilter: string[] | null
  }
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
  autoHideSidebar: boolean
  devTools: boolean
}

/** Wire callback type for main → renderer push when the indexed dataset
 *  invalidates (today: fs.watch debounce on the recordings folder). */
type Unsubscribe = () => void

/** Status of the in-app auto-updater. Mirrors the implementation in
 *  `src/main/updater.ts`; lives here so the IPC contract is in one
 *  place. */
export type UpdaterStatus =
  | { kind: 'idle' }
  | { kind: 'checking' }
  | { kind: 'up-to-date'; version: string }
  | { kind: 'available'; version: string }
  | { kind: 'downloading'; percent: number }
  | { kind: 'downloaded'; version: string }
  | { kind: 'error'; message: string }

/**
 * Status of the optional Myme integration. Mirrors the implementation in
 * `src/main/myme/index.ts`; lives here so the IPC contract is one place.
 *
 * The renderer composes the "disabled" UX (when demo mode is on or no
 * recordings path is set) from `configStore` — main always reports the
 * sync engine's actual state. Card states the user sees:
 *
 *   - `disconnected`              → endpoint + "Connect to Myme" CTA
 *   - `connecting` (mode: device) → user-code + "Verify in browser" pane,
 *                                   with a "use API key instead" link
 *   - `connecting` (mode: api-key)→ API-key paste-and-verify pane
 *   - `connected` (no error)      → "last synced …" + "Sync now"
 *   - `connected` (with error)    → as above + inline error row
 *   - `syncing`                   → progress phase + processed/total
 *
 * Default auth is the OAuth device-flow (`startDeviceFlow` from the SDK).
 * The API-key paste path stays as a dev/escape hatch — surfaced via the
 * "use API key instead" link on the device-flow connecting pane.
 * Tokens are encrypted via `safeStorage` and persisted to
 * `<userData>/myme-credential.enc`.
 */
export type MymeSyncPhase = 'preparing' | 'recordings' | 'sessions'

/**
 * Identity payload returned by `myme.probeConnection`. On success, the
 * card surfaces the user's email + role in the connection header; on
 * failure, the error string lands inline.
 */
export type ProbeResult =
  | {
      ok: true
      /** Email from the profile, when present. */
      email: string | null
      /** Display name composed from first + last name (or username
       *  fallback). */
      displayName: string | null
    }
  | { ok: false; error: string }

/**
 * Compact summary of a server-side type, returned by
 * `myme.listTypes()`. Enough to render a picker (id + label +
 * description) and an auto-pair preview (field names), without pulling
 * the full SDK `TypeSchema` shape into the renderer.
 */
export interface TypeSummary {
  id: string
  label: string | null
  description: string | null
  parent: string | null
  fields: string[]
}

export type MymeStatus =
  | {
      kind: 'disconnected'
      endpoint: string
      /** Populated when a previous connect attempt failed. Cleared on
       *  successful connect or disconnect. */
      lastError: string | null
    }
  | {
      kind: 'connecting'
      mode: 'api-key'
      endpoint: string
    }
  | {
      kind: 'connecting'
      mode: 'device'
      endpoint: string
      /** Short user-readable code (XXXX-XXXX shape) the user types into
       *  the verification page. */
      userCode: string
      /** Plain verification URL — show as fallback if `verificationUriComplete`
       *  is absent or the user wants to type the code manually. */
      verificationUri: string
      /** Deep-link variant with the code pre-filled. When present, the
       *  "Verify in browser" button opens this so the user doesn't have
       *  to type the code at all. */
      verificationUriComplete: string | null
      /** Unix ms — used by the renderer to show a "code expires in …"
       *  countdown if we want one later. */
      expiresAt: number
    }
  | {
      kind: 'connected'
      endpoint: string
      /** ISO; null until the first successful sync. */
      lastSyncedAt: string | null
      /** Set after a failed sync; cleared on the next success. */
      lastError: string | null
    }
  | {
      kind: 'syncing'
      endpoint: string
      phase: MymeSyncPhase
      processed: number
      total: number
    }

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
      ipcRenderer.invoke('config:setDemoMode', enabled),
    /** Toggle the auto-hide sidebar behaviour. When on, narrow windows
     *  (≤900px) hide the sidebar automatically; when off the user controls
     *  it entirely via Cmd-B / the navbar icon. */
    setAutoHideSidebar: (enabled: boolean): Promise<ConfigStatus> =>
      ipcRenderer.invoke('config:setAutoHideSidebar', enabled),
    /** Toggle DevTools open/close. Persists across restarts. */
    setDevTools: (enabled: boolean): Promise<ConfigStatus> =>
      ipcRenderer.invoke('config:setDevTools', enabled),
    /** Wipe the persisted config back to defaults — clears the saved
     *  folder, demo flag, custom filler dictionary, etc. The renderer
     *  follows up by triggering a fresh hydrate so the dataStore picks
     *  up the cleared state. Used by Settings → About → Reset app. */
    reset: (): Promise<ConfigStatus> => ipcRenderer.invoke('config:reset')
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
  updater: {
    /** Return the latest cached updater status. The renderer also
     *  subscribes to `onStatus` below to get push updates. */
    status: (): Promise<UpdaterStatus> => ipcRenderer.invoke('updater:status'),
    /** Force a check now (Settings → Check for updates). */
    check: (): Promise<UpdaterStatus> => ipcRenderer.invoke('updater:check'),
    /** Subscribe to push status updates from the main-process updater. */
    onStatus: (handler: (status: UpdaterStatus) => void): Unsubscribe => {
      const listener = (_e: unknown, payload: UpdaterStatus): void => handler(payload)
      ipcRenderer.on('updater:status', listener)
      return () => ipcRenderer.removeListener('updater:status', listener)
    }
  },
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('shell:openExternal', url),
  myme: {
    /** Current sync-engine status. The renderer composes the
     *  "disabled" state from configStore (demoMode / null path); main
     *  always reports `disconnected` / `connected` / etc. */
    status: (): Promise<MymeStatus> => ipcRenderer.invoke('myme:status'),
    /** Persist a new Myme endpoint URL. Returns the updated status. */
    setEndpoint: (url: string): Promise<MymeStatus> => ipcRenderer.invoke('myme:setEndpoint', url),
    /** Default connect path — initiates the OAuth device flow against
     *  the configured endpoint. Returns a `connecting` (mode: 'device')
     *  status carrying the user code + verification URI; the renderer
     *  shows that, and a background poll resolves to `connected` on
     *  user approval (push lands via `onStatus`). */
    connect: (): Promise<MymeStatus> => ipcRenderer.invoke('myme:connect'),
    /** Dev/escape-hatch path: transition the card into the API-key
     *  paste pane. Linked from the device-flow connecting pane via
     *  "use API key instead". */
    useApiKey: (): Promise<MymeStatus> => ipcRenderer.invoke('myme:useApiKey'),
    /** Verify the supplied API key against the current endpoint and, on
     *  success, encrypt + persist it. Resolves with the new status —
     *  `connected` on success, `disconnected` with `lastError` set on
     *  failure. */
    submitApiKey: (key: string): Promise<MymeStatus> =>
      ipcRenderer.invoke('myme:submitApiKey', key),
    /** Cancel an in-progress connect attempt (device-flow polling or
     *  API-key pane). Falls back to `disconnected`. */
    cancelConnect: (): Promise<MymeStatus> => ipcRenderer.invoke('myme:cancelConnect'),
    /** Revoke the persisted token + clear sync state. */
    disconnect: (): Promise<MymeStatus> => ipcRenderer.invoke('myme:disconnect'),
    /** Manual sync trigger. Returns when the sync completes (success
     *  or otherwise); intermediate progress lands via `onStatus`. */
    syncNow: (): Promise<MymeStatus> => ipcRenderer.invoke('myme:syncNow'),
    /** Abort the currently-running sync. Returns the post-cancel
     *  status (typically `connected` with `lastError = 'Cancelled'`).
     *  No-op when nothing is in flight. */
    cancelSync: (): Promise<MymeStatus> => ipcRenderer.invoke('myme:cancelSync'),
    /** Run a small dry-run sync against the 5 most recent recordings.
     *  Useful for sanity-checking the integration without touching the
     *  full corpus. Skips soft-delete and session derivation while the
     *  cap is in effect. */
    testSync: (): Promise<MymeStatus> => ipcRenderer.invoke('myme:testSync'),
    /** Read the persisted mapping config. */
    getMapping: (): Promise<MymeMapping> => ipcRenderer.invoke('myme:getMapping'),
    /** Persist a new mapping. Resets the sync state so the next pass
     *  treats every recording as new under the fresh fingerprints. */
    setMapping: (mapping: MymeMapping): Promise<MymeMapping> =>
      ipcRenderer.invoke('myme:setMapping', mapping),
    /** Read the persisted mode filter. `null` = no filter. */
    getModeFilter: (): Promise<string[] | null> => ipcRenderer.invoke('myme:getModeFilter'),
    /** Persist the Superwhisper-mode filter. `null` clears it. */
    setModeFilter: (modes: string[] | null): Promise<string[] | null> =>
      ipcRenderer.invoke('myme:setModeFilter', modes),
    /** Probe the configured endpoint with the current credential.
     *  Backs the "Test connection" button. */
    probeConnection: (): Promise<ProbeResult> => ipcRenderer.invoke('myme:probeConnection'),
    /** List the types registered on the server. `null` on failure. */
    listTypes: (): Promise<TypeSummary[] | null> => ipcRenderer.invoke('myme:listTypes'),
    /** Register a user-authored type schema. Returns the persisted
     *  schema on success; `null` on failure (renderer can re-probe via
     *  `listTypes` to see what happened). */
    registerType: (schema: unknown): Promise<unknown> =>
      ipcRenderer.invoke('myme:registerType', schema),
    /** Subscribe to status changes from the sync engine. */
    onStatus: (handler: (status: MymeStatus) => void): Unsubscribe => {
      const listener = (_e: unknown, payload: MymeStatus): void => handler(payload)
      ipcRenderer.on('myme:status', listener)
      return () => ipcRenderer.removeListener('myme:status', listener)
    }
  }
}

export type Api = typeof api
