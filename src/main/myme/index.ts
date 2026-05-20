import { BrowserWindow } from 'electron'
import { MymeError, UnauthorizedError, type TypeSchema } from '@mymehq/sdk'
import { startDeviceFlow, OAuthError } from '@mymehq/sdk/auth'
import type { DeviceFlowHandle } from '@mymehq/sdk/auth'
import type { MymeStatus, ProbeResult, TypeSummary } from '../../preload/api'
import { onReindexed } from '../cache'
import { getConfig, setConfig } from '../config'
import { getClient, invalidateClient } from './client'
import { syncRun } from './engine'
import { defaultMapping, type MymeMapping } from './mapping'
import { clearState, loadState } from './state'
import { SafeStorageTokenStorage } from './token-storage'
import { clearCredential, credentialExists, readCredential, writeCredential } from './tokens'

/**
 * Public surface of the Myme integration module — used by `ipc.ts`.
 *
 * State machine (mirrors `MymeStatus`):
 *
 *   disconnected ── connect ─────▶ connecting(device) ─poll approve─▶ connected
 *           │                            │ useApiKey                       ▲
 *           │                            ▼                                 │
 *           │                       connecting(api-key) ── submitApiKey ───┤
 *           │                                                              │
 *           └──────────────── disconnect ◀──────── connected ◀─┐           │
 *                                                       │     │ (sync     │
 *                                                       ▼     │  complete)│
 *                                                    syncing ─┘           │
 *
 * The `disabled` UX state (demo mode on, or no recordings path) is
 * composed in the renderer from `configStore`; main always reports the
 * engine's actual state.
 *
 * Boot behaviour: on first call to `getStatus()`, the module probes
 * `<userData>/myme-credential.enc`. If a credential is present and
 * decryptable, the initial status is `connected` (no last-synced time
 * until the engine actually runs); otherwise it's `disconnected`.
 *
 * Default auth is the OAuth device flow: `startDeviceFlow` from the SDK
 * (`@mymehq/sdk/auth`) initiates `/auth/device`, returns the user-code +
 * verification URI, and `pollForToken()` blocks until the user approves.
 * On approval we persist the token bundle through `tokens.ts` and the
 * existing `connected` terminal state takes over.
 *
 * The API-key path stays as a dev/escape hatch — linked from the
 * device-flow connecting pane. Both terminate at `connected` and share
 * the rest of the engine.
 */

const STATUS_CHANNEL = 'myme:status'

/** OAuth client metadata used for DCR + device-flow. Stored in the
 *  credential blob alongside the tokens. */
const CLIENT_NAME = 'SuperWhisper Analytics'
/**
 * Scopes the test app actually needs. Must be a subset of the server's
 * OAuth allowlist (which mirrors top-level `TYPE_REGISTRY` ids +
 * `EDGE_TYPE_REGISTRY` ids + OIDC standards).
 *
 * Subtype gotcha: `superwhisper.recording` was re-registered as a
 * subtype of `core.note` (parent: core.note). Subtype scopes are NOT
 * published in the OAuth allowlist — DCR rejects them with
 * `invalid_scope: cannot request scope superwhisper.recording:read`.
 * The right scope for a `core.note` subtype is `core.note:*` on the
 * parent. Verified against `/.well-known/oauth-authorization-server`
 * `scopes_supported`. `superwhisper.session` is a top-level type, so
 * its own `:read/write` scopes remain valid.
 *
 *  - `core.note:*`             — recording data plane (via the subtype parent)
 *  - `superwhisper.session:*`  — derived sessions (top-level type)
 *  - `metadata.types:write`    — registers the custom types on first sync
 *  - `edge.parent-of:*`        — session→recording linkage minted in the
 *                                sessions pass (engine.ts:464)
 *  - `openid profile email offline_access` — OIDC standards + refresh
 */
const DEFAULT_SCOPES = [
  'core.note:read',
  'core.note:write',
  'superwhisper.session:read',
  'superwhisper.session:write',
  'metadata.types:write',
  'edge.parent-of:read',
  'edge.parent-of:write',
  'openid',
  'profile',
  'email',
  'offline_access'
]

const DEVICE_CODE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code'

// Lazy-initialised so the boot-time probe runs after `app.ready` —
// `safeStorage.isEncryptionAvailable()` returns false until then on
// macOS, which would mis-classify a connected user as disconnected on
// every launch.
let currentStatus: MymeStatus | null = null

// In-flight device-flow polling — abort signal lets `cancelConnect`
// short-circuit a long-running poll.
let activeDeviceFlowAbort: AbortController | null = null

// In-flight sync state. Coalesces concurrent `syncNow` / `testSync`
// calls; the single-promise guard means a click on either while a sync
// is running returns the in-flight promise rather than spawning a
// second pass.
let syncInFlight: Promise<MymeStatus> | null = null
let activeAbort: AbortController | null = null

function endpointSnapshot(): string {
  return getConfig().myme.endpoint
}

/**
 * Snapshot the engine state for inclusion in a `connected` status —
 * synced counts + the persisted last-full-sync timestamp. Reading
 * `loadState()` is cheap (sub-ms for typical sizes) and keeps the
 * status payload honest across app restarts.
 */
function syncedSnapshot(): {
  syncedRecordings: number
  syncedSessions: number
  lastFullSyncAt: string | null
} {
  const state = loadState()
  return {
    syncedRecordings: Object.keys(state.recordings).length,
    syncedSessions: Object.keys(state.sessions).length,
    lastFullSyncAt: state.lastFullSyncAt
  }
}

function buildInitialStatus(): MymeStatus {
  const endpoint = endpointSnapshot()
  if (credentialExists() && readCredential() !== null) {
    const snap = syncedSnapshot()
    return {
      kind: 'connected',
      endpoint,
      lastSyncedAt: snap.lastFullSyncAt,
      lastError: null,
      syncedRecordings: snap.syncedRecordings,
      syncedSessions: snap.syncedSessions,
      lastSyncCancelled: false
    }
  }
  return { kind: 'disconnected', endpoint, lastError: null }
}

function ensureStatus(): MymeStatus {
  if (currentStatus === null) currentStatus = buildInitialStatus()
  return currentStatus
}

function setStatus(next: MymeStatus): MymeStatus {
  currentStatus = next
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    win.webContents.send(STATUS_CHANNEL, next)
  }
  return next
}

export function getStatus(): MymeStatus {
  return ensureStatus()
}

export function setEndpoint(url: string): MymeStatus {
  const trimmed = url.trim()
  const existing = getConfig().myme
  setConfig({ myme: { ...existing, endpoint: trimmed } })
  invalidateClient()
  // Endpoint only changes the URL the next request will hit; the
  // credential still applies. If the card is currently `connected` but
  // the user changed the endpoint, the next sync attempt is what
  // surfaces a failure — we don't pre-emptively flip status here.
  setStatus({ ...ensureStatus(), endpoint: trimmed } as MymeStatus)
  return ensureStatus()
}

/** Run a small dry-run sync against the 5 most recent recordings.
 *  Useful for sanity-checking the integration without touching the
 *  full corpus. Skips soft-delete and session derivation while the
 *  cap is in effect, so the test run never trashes existing items
 *  beyond the cap. */
export async function testSync(): Promise<MymeStatus> {
  if (syncInFlight) return syncInFlight
  const status = ensureStatus()
  if (status.kind !== 'connected') return status
  syncInFlight = runSync({ limit: 5 })
  try {
    return await syncInFlight
  } finally {
    syncInFlight = null
    activeAbort = null
  }
}

/** Read the persisted mapping config. The renderer hydrates this on
 *  first paint of the Settings card so it can render the current
 *  binding without round-tripping for every field. */
export function getMapping(): MymeMapping {
  return getConfig().myme.mapping ?? defaultMapping()
}

/** Persist a new mapping. Trash-and-re-mint happens naturally on the
 *  next sync — fresh fingerprint → fresh source_ids → old items diff
 *  out and soft-delete. Clears the in-memory sync state so the diff
 *  starts clean; the old `lastFullSyncAt` is dropped along with it so
 *  the next sync surfaces as a fresh run on the card.
 *
 *  Returns the persisted mapping so the renderer can confirm what
 *  landed (server-side validation on `register` may rewrite or fail
 *  later, but the persistence step is fire-and-forget). */
export function setMapping(mapping: MymeMapping): MymeMapping {
  const existing = getConfig().myme
  setConfig({ myme: { ...existing, mapping } })
  // Reset the sync state so the next pass treats every recording as
  // new under the fresh fingerprints. Without this the diff would
  // try to update items at the *old* source_ids (which the new
  // projection no longer produces).
  clearState()
  return mapping
}

/** Read the persisted mode filter. `null` = no filter. */
export function getModeFilter(): string[] | null {
  return getConfig().myme.modeFilter ?? null
}

/** Persist the Superwhisper-mode filter. `null` clears it. */
export function setModeFilter(modes: string[] | null): string[] | null {
  const existing = getConfig().myme
  const next = modes && modes.length > 0 ? [...new Set(modes)].sort() : null
  setConfig({ myme: { ...existing, modeFilter: next } })
  return next
}

/**
 * Probe the configured endpoint with the current credential. Returns
 * a small identity payload on success, or an error string on failure.
 * Backs the "Test connection" button in the connected card.
 */
export async function probeConnection(): Promise<ProbeResult> {
  const client = getClient()
  if (!client) {
    return { ok: false, error: 'No credential available.' }
  }
  try {
    const profile = await client.profile.get()
    const composed =
      [profile.first_name, profile.last_name].filter((s): s is string => Boolean(s)).join(' ') ||
      profile.username ||
      null
    return {
      ok: true,
      email: profile.email ?? null,
      displayName: composed
    }
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { ok: false, error: 'Credential rejected — reconnect.' }
    }
    if (err instanceof MymeError) return { ok: false, error: err.message }
    if (err instanceof Error) return { ok: false, error: err.message }
    return { ok: false, error: 'Connection probe failed.' }
  }
}

/** List the types registered on the server. Used by the mapping
 *  picker's "existing type" mode. Returns null on failure so the UI
 *  can surface an error state cleanly. */
export async function listServerTypes(): Promise<TypeSummary[] | null> {
  const client = getClient()
  if (!client) return null
  try {
    const types = await client.types.list()
    return types.map((t) => ({
      id: t.id,
      label: t.label ?? null,
      description: t.description ?? null,
      parent: t.parent ?? null,
      fields: Object.keys(t.fields ?? {})
    }))
  } catch (err) {
    console.warn('[myme] listServerTypes failed:', err)
    return null
  }
}

/** Register a user-authored type schema against the server. Wraps
 *  `client.types.register` so the renderer doesn't have to know about
 *  the SDK. */
export async function registerType(schema: TypeSchema): Promise<TypeSchema | null> {
  const client = getClient()
  if (!client) return null
  try {
    return await client.types.register(schema)
  } catch (err) {
    console.warn('[myme] registerType failed:', err)
    return null
  }
}

/**
 * Default connect path — initiate the OAuth device flow against the
 * configured endpoint. Registers a fresh OAuth client via DCR
 * (`POST /auth/oauth2/register`) so each device has its own client id,
 * then calls SDK's `startDeviceFlow` and surfaces the resulting
 * user-code + verification URI on the connecting pane. A background
 * poll waits for user approval; success transitions to `connected`,
 * failure to `disconnected` with a sensible `lastError`.
 */
export async function connect(): Promise<MymeStatus> {
  const endpoint = endpointSnapshot()
  // Optimistic transition so the renderer can show a "preparing…" UX if
  // it wants; the real device-flow payload arrives a moment later.
  setStatus({
    kind: 'connecting',
    mode: 'device',
    endpoint,

    userCode: '',
    verificationUri: '',
    verificationUriComplete: null,
    expiresAt: 0
  })

  let handle: DeviceFlowHandle
  let clientId: string
  try {
    clientId = await registerOAuthClient(endpoint)
    // SafeStorageTokenStorage adapts the SDK's `TokenStorage` interface
    // to our `safeStorage`-backed credential file. The SDK writes
    // directly through it when the user approves the device-flow code,
    // so there's no post-hoc lift step.
    handle = await startDeviceFlow({
      issuer: endpoint,
      clientId,
      scopes: DEFAULT_SCOPES,
      storage: new SafeStorageTokenStorage(clientId)
    })
  } catch (err) {
    return setStatus({
      kind: 'disconnected',
      endpoint,

      lastError: describeAuthError(err)
    })
  }

  setStatus({
    kind: 'connecting',
    mode: 'device',
    endpoint,

    userCode: handle.user_code,
    verificationUri: handle.verification_uri,
    verificationUriComplete: handle.verification_uri_complete || null,
    expiresAt: Date.now() + handle.expires_in * 1000
  })

  activeDeviceFlowAbort = new AbortController()
  const signal = activeDeviceFlowAbort.signal

  try {
    await handle.pollForToken({ signal })
    // SafeStorageTokenStorage wrote the credential to disk during the
    // SDK's `provider.persist()` call inside `pollForToken`, so nothing
    // more to do here — just drop the cached client so the next
    // `getClient()` rebuilds against the freshly-stored credential.
    invalidateClient()

    // Verify the new credentials against the server before flipping to
    // `connected` — same probe shape as the API-key path.
    const client = getClient()
    if (!client) throw new Error('client construction failed after device-flow approval')
    await client.items.stats()

    return setStatus(connectedStatus(endpoint))
  } catch (err) {
    clearCredential()
    invalidateClient()
    return setStatus({
      kind: 'disconnected',
      endpoint,

      lastError: describeAuthError(err)
    })
  } finally {
    activeDeviceFlowAbort = null
  }
}

/**
 * Build a fresh `connected` status from the persisted engine state.
 * Used wherever we transition to connected (device-flow success,
 * API-key success, sync completion). Centralised so the synced-count
 * + last-sync-cancelled fields don't drift between call sites.
 */
function connectedStatus(
  endpoint: string,
  opts?: { lastError?: string | null; lastSyncCancelled?: boolean; lastSyncedAt?: string | null }
): Extract<MymeStatus, { kind: 'connected' }> {
  const snap = syncedSnapshot()
  return {
    kind: 'connected',
    endpoint,
    lastSyncedAt: opts?.lastSyncedAt ?? snap.lastFullSyncAt,
    lastError: opts?.lastError ?? null,
    syncedRecordings: snap.syncedRecordings,
    syncedSessions: snap.syncedSessions,
    lastSyncCancelled: opts?.lastSyncCancelled ?? false
  }
}

/**
 * Dev/escape hatch — transition into the API-key paste pane. Linked
 * from the device-flow connecting pane via "use API key instead".
 * If a device-flow poll is in flight, cancel it first.
 */
export function useApiKey(): MymeStatus {
  if (activeDeviceFlowAbort) {
    activeDeviceFlowAbort.abort()
    activeDeviceFlowAbort = null
  }
  const endpoint = endpointSnapshot()
  return setStatus({ kind: 'connecting', mode: 'api-key', endpoint })
}

/** Cancel an in-progress connect attempt. Aborts a device-flow poll if
 *  one is running, then falls back to `disconnected`. Safe to call from
 *  either connecting variant. */
export function cancelConnect(): MymeStatus {
  if (activeDeviceFlowAbort) {
    activeDeviceFlowAbort.abort()
    activeDeviceFlowAbort = null
  }
  const endpoint = endpointSnapshot()
  return setStatus({ kind: 'disconnected', endpoint, lastError: null })
}

/**
 * Verify a user-supplied API key against the current endpoint. On
 * success, encrypt + persist it and flip status to `connected`. On
 * failure, flip back to `disconnected` with a user-readable error so
 * the card can surface what went wrong.
 *
 * Verification is a cheap probe — `client.items.stats()` returns a
 * tiny payload and only succeeds against a valid key.
 */
export async function submitApiKey(key: string): Promise<MymeStatus> {
  const trimmed = key.trim()
  const endpoint = endpointSnapshot()
  if (!trimmed) {
    return setStatus({
      kind: 'disconnected',
      endpoint,

      lastError: 'API key is empty.'
    })
  }
  // Temporarily stage the key so getClient() picks it up; persist only
  // after verification succeeds (so a failed attempt doesn't leave a
  // bad credential on disk).
  const persisted = writeCredential({ kind: 'api-key', key: trimmed })
  if (!persisted) {
    return setStatus({
      kind: 'disconnected',
      endpoint,

      lastError: 'Could not encrypt credential (safeStorage unavailable).'
    })
  }
  invalidateClient()
  try {
    const client = getClient()
    if (!client) throw new Error('client construction failed')
    await client.items.stats()
    return setStatus(connectedStatus(endpoint))
  } catch (err) {
    clearCredential()
    invalidateClient()
    const message = describeAuthError(err)
    return setStatus({ kind: 'disconnected', endpoint, lastError: message })
  }
}

export function disconnect(): MymeStatus {
  if (activeDeviceFlowAbort) {
    activeDeviceFlowAbort.abort()
    activeDeviceFlowAbort = null
  }
  clearCredential()
  clearState()
  invalidateClient()
  const endpoint = endpointSnapshot()
  setStatus({ kind: 'disconnected', endpoint, lastError: null })
  return ensureStatus()
}

/**
 * Wipe all SuperWhisper-typed items from the connected Myme tenant.
 * Bulk-purges `superwhisper.recording` + `superwhisper.session` via
 * `client.items.bulkAction`, then clears the local sync state so the
 * next sync re-mints everything from scratch.
 *
 * Developer-tab affordance — fast way to reset staging for testing.
 * No confirmation dialog yet (the confirmation pattern lands with the
 * toast system, not this ticket); callers should make sure the user
 * knows what they're triggering.
 */
export async function purgeAllData(): Promise<
  { ok: true; recordings: number; sessions: number } | { ok: false; error: string }
> {
  const client = getClient()
  if (!client) return { ok: false, error: 'Not connected.' }
  try {
    const [recRes, sesRes] = await Promise.all([
      client.items.bulkAction({
        action: 'purge',
        confirm: 'PURGE',
        filter: { type: 'superwhisper.recording', state: 'active' },
        max_items: 50000
      }),
      client.items.bulkAction({
        action: 'purge',
        confirm: 'PURGE',
        filter: { type: 'superwhisper.session', state: 'active' },
        max_items: 50000
      })
    ])
    // Local sync state is now stale — clearing it forces the next sync
    // to treat every recording as fresh and re-mint, instead of seeing
    // server-side ghosts via stored itemIds that no longer exist.
    clearState()
    return {
      ok: true,
      recordings: recRes.succeeded,
      sessions: sesRes.succeeded
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) }
  }
}

/**
 * Run one sync pass against the configured tenant. Flips the card to
 * `syncing` for the duration; resolves to `connected` (with or without
 * a last-sync error) on success, or `disconnected` on auth failure.
 *
 * Concurrent calls are coalesced — a second `syncNow` while one is in
 * flight returns the current status without spawning a parallel run.
 * Same engine path is reused by the watcher cascade in milestone 5.
 */
export async function syncNow(): Promise<MymeStatus> {
  if (syncInFlight) return syncInFlight
  const status = ensureStatus()
  if (status.kind !== 'connected') return status
  syncInFlight = runSync()
  try {
    return await syncInFlight
  } finally {
    syncInFlight = null
    activeAbort = null
  }
}

/** Abort the in-flight sync, if any. The engine persists whatever's
 *  already landed and returns; this function flips the status back to
 *  `connected` with `lastError = "Cancelled"` so the card surfaces the
 *  outcome. A noop when nothing is in flight. */
export function cancelSync(): MymeStatus {
  if (activeAbort) activeAbort.abort()
  return ensureStatus()
}

async function runSync(opts: { limit?: number } = {}): Promise<MymeStatus> {
  const endpoint = endpointSnapshot()
  const status = ensureStatus()
  const previousLastSyncedAt = status.kind === 'connected' ? status.lastSyncedAt : null

  setStatus({
    kind: 'syncing',
    endpoint,
    phase: 'preparing',
    processed: 0,
    total: 0
  })

  activeAbort = new AbortController()
  const cfg = getConfig().myme
  const outcome = await syncRun({
    limit: opts.limit ?? 0,
    mapping: cfg.mapping,
    modeFilter: cfg.modeFilter,
    signal: activeAbort.signal,
    onProgress: (e) => {
      setStatus({
        kind: 'syncing',
        endpoint,
        phase: e.phase,
        processed: e.processed,
        total: e.total
      })
    }
  })

  if (outcome.skipped === 'no-client') {
    // Credential disappeared between status check and engine call —
    // surface as disconnected so the card prompts a reconnect.
    return setStatus({
      kind: 'disconnected',
      endpoint,

      lastError: 'No credential available.'
    })
  }

  if (outcome.error && /Authentication/i.test(outcome.error)) {
    clearCredential()
    return setStatus({ kind: 'disconnected', endpoint, lastError: outcome.error })
  }

  const lastSyncedAt = outcome.ok ? outcome.finishedAt : previousLastSyncedAt
  // Distinguish user-cancelled from a genuine failure. The engine
  // returns `error: 'Cancelled'` for the abort path; that becomes
  // `lastSyncCancelled: true` here so the renderer can render "Sync
  // cancelled" instead of "Sync failed".
  const cancelled = !outcome.ok && outcome.error === 'Cancelled'
  const next = setStatus(
    connectedStatus(endpoint, {
      lastSyncedAt,
      lastError: outcome.ok ? null : outcome.error,
      lastSyncCancelled: cancelled
    })
  )
  console.log(
    `[myme] sync completed: created=${outcome.counts.created} updated=${outcome.counts.updated} ` +
      `soft-deleted=${outcome.counts.softDeleted} no-op=${outcome.counts.noop} ` +
      `errored=${outcome.counts.errored}`
  )
  return next
}

/** Translate an arbitrary error from the SDK or transport into the
 *  single-line message that surfaces on the card. */
function describeAuthError(err: unknown): string {
  if (err instanceof OAuthError) {
    // RFC 8628 terminal codes — give the user something they can act on.
    switch (err.code) {
      case 'access_denied':
        return 'Connection cancelled in browser.'
      case 'expired_token':
        return 'The verification code expired. Try connecting again.'
      case 'invalid_grant':
        return 'Device-flow approval was rejected by the server.'
      case 'invalid_request':
        return err.message || 'Device-flow request was invalid.'
      default:
        return err.message || `OAuth error: ${err.code}`
    }
  }
  if (err instanceof UnauthorizedError) {
    return 'Invalid API key. Generate a fresh one in your Myme client and try again.'
  }
  if (err instanceof MymeError) {
    return err.message
  }
  if (err instanceof Error) {
    return err.message
  }
  return 'Connection failed.'
}

/**
 * Subscribe the integration to the cache's reindex cascade so a sync
 * fires whenever the recording set changes. Fire-and-forget; the
 * engine's `syncInFlight` guard coalesces overlapping runs, so back-
 * to-back watcher events don't spawn parallel syncs.
 *
 * Demo mode / no-path / disconnected → noop (the engine bails on no
 * client, but we'd rather skip the round trip entirely). Called once
 * from `src/main/index.ts` at `app.whenReady`.
 */
export function registerReindexHook(): void {
  onReindexed((payload) => {
    if (payload.error) return
    if (currentStatus?.kind !== 'connected') return
    const config = getConfig()
    if (config.demoMode || !config.superwhisperPath) return
    void syncNow().catch((err) => console.warn('[myme] reindex-triggered sync failed:', err))
  })
}

// ---------------------------------------------------------------------------
// OAuth bootstrap helpers — DCR + token persistence
// ---------------------------------------------------------------------------

interface DcrResponse {
  client_id: string
}

/** Register a fresh OAuth client via Dynamic Client Registration. The
 *  client_id is persisted alongside the tokens — each install ends up
 *  with its own client_id, so revoking one device doesn't cascade to
 *  the others. */
async function registerOAuthClient(endpoint: string): Promise<string> {
  const issuer = endpoint.replace(/\/+$/, '')
  const res = await fetch(`${issuer}/auth/oauth2/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      grant_types: [DEVICE_CODE_GRANT_TYPE, 'refresh_token'],
      client_name: CLIENT_NAME,
      scope: DEFAULT_SCOPES.join(' ')
    })
  })
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: unknown }
    const code =
      typeof body.error === 'string'
        ? body.error
        : typeof body.error === 'object' && body.error !== null
          ? ((body.error as { code?: string }).code ?? 'invalid_request')
          : 'invalid_request'
    throw new Error(`Client registration failed: ${code} (${res.status})`)
  }
  const body = (await res.json()) as DcrResponse
  if (typeof body.client_id !== 'string' || body.client_id.length === 0) {
    throw new Error('Client registration returned no client_id')
  }
  return body.client_id
}
