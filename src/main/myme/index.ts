import { BrowserWindow } from 'electron'
import { MymeError, UnauthorizedError } from '@mymehq/sdk'
import { startDeviceFlow, OAuthError, InMemoryTokenStorage } from '@mymehq/sdk/auth'
import type { DeviceFlowHandle, TokenStorage } from '@mymehq/sdk/auth'
import type { MymeStatus } from '../../preload/api'
import { onReindexed } from '../cache'
import { getConfig, setConfig } from '../config'
import { getClient, invalidateClient } from './client'
import { syncRun } from './engine'
import { clearState } from './state'
import {
  clearCredential,
  credentialExists,
  readCredential,
  writeCredential,
  type OAuthTokenBundle
} from './tokens'

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
 * allowlist (`TYPE_REGISTRY.keys() + EDGE_TYPE_REGISTRY.keys()` + OIDC
 * standards). Bare wildcards like `*:read` / `*:write` are NOT in the
 * allowlist and produce `invalid_scope` at DCR time — the prior set was
 * a placeholder, replaced here with the genuine surface:
 *
 *  - `superwhisper.recording:*` — the data plane
 *  - `superwhisper.session:*`   — derived sessions
 *  - `metadata.types:write`     — registers the custom types on first sync
 *  - `openid profile email offline_access` — OIDC standards + refresh
 */
const DEFAULT_SCOPES = [
  'superwhisper.recording:read',
  'superwhisper.recording:write',
  'superwhisper.session:read',
  'superwhisper.session:write',
  'metadata.types:write',
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

function configSnapshot(): { endpoint: string; syncLimit: number } {
  const c = getConfig()
  return { endpoint: c.myme.endpoint, syncLimit: c.myme.syncLimit }
}

function buildInitialStatus(): MymeStatus {
  const { endpoint, syncLimit } = configSnapshot()
  if (credentialExists() && readCredential() !== null) {
    return { kind: 'connected', endpoint, syncLimit, lastSyncedAt: null, lastError: null }
  }
  return { kind: 'disconnected', endpoint, syncLimit, lastError: null }
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

/** Persist the "push N most-recent" testing knob. Reflected on the
 *  card and threaded through the engine's next `syncRun()`. */
export function setSyncLimit(value: number): MymeStatus {
  const clamped = Number.isFinite(value) ? Math.max(0, Math.floor(value)) : 0
  const existing = getConfig().myme
  setConfig({ myme: { ...existing, syncLimit: clamped } })
  setStatus({ ...ensureStatus(), syncLimit: clamped } as MymeStatus)
  return ensureStatus()
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
  const { endpoint, syncLimit } = configSnapshot()
  // Optimistic transition so the renderer can show a "preparing…" UX if
  // it wants; the real device-flow payload arrives a moment later.
  setStatus({
    kind: 'connecting',
    mode: 'device',
    endpoint,
    syncLimit,
    userCode: '',
    verificationUri: '',
    verificationUriComplete: null,
    expiresAt: 0
  })

  let handle: DeviceFlowHandle
  let clientId: string
  // Inject our own storage so we can pull the persisted bundle back out
  // after `pollForToken` resolves — the SDK persists the bundle as JSON
  // under a key it owns; we re-read that JSON and write it to our own
  // safeStorage-backed credential file.
  const flowStorage = new InMemoryTokenStorage()
  try {
    clientId = await registerOAuthClient(endpoint)
    handle = await startDeviceFlow({
      issuer: endpoint,
      clientId,
      scopes: DEFAULT_SCOPES,
      storage: flowStorage
    })
  } catch (err) {
    return setStatus({
      kind: 'disconnected',
      endpoint,
      syncLimit,
      lastError: describeAuthError(err)
    })
  }

  setStatus({
    kind: 'connecting',
    mode: 'device',
    endpoint,
    syncLimit,
    userCode: handle.user_code,
    verificationUri: handle.verification_uri,
    verificationUriComplete: handle.verification_uri_complete || null,
    expiresAt: Date.now() + handle.expires_in * 1000
  })

  activeDeviceFlowAbort = new AbortController()
  const signal = activeDeviceFlowAbort.signal

  try {
    await handle.pollForToken({ signal })
    // The SDK persists the bundle as JSON under a key shaped
    // `myme.auth.tokens:<origin>:<client_id>` in whatever storage we
    // passed in. Pull it back out, copy across to our safeStorage-backed
    // credential file, and discard the in-memory copy.
    await persistTokensFromStorage(flowStorage, endpoint, clientId)
    invalidateClient()

    // Verify the new credentials against the server before flipping to
    // `connected` — same probe shape as the API-key path.
    const client = getClient()
    if (!client) throw new Error('client construction failed after device-flow approval')
    await client.items.stats()

    return setStatus({
      kind: 'connected',
      endpoint,
      syncLimit,
      lastSyncedAt: null,
      lastError: null
    })
  } catch (err) {
    clearCredential()
    invalidateClient()
    return setStatus({
      kind: 'disconnected',
      endpoint,
      syncLimit,
      lastError: describeAuthError(err)
    })
  } finally {
    activeDeviceFlowAbort = null
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
  const { endpoint, syncLimit } = configSnapshot()
  return setStatus({ kind: 'connecting', mode: 'api-key', endpoint, syncLimit })
}

/** Cancel an in-progress connect attempt. Aborts a device-flow poll if
 *  one is running, then falls back to `disconnected`. Safe to call from
 *  either connecting variant. */
export function cancelConnect(): MymeStatus {
  if (activeDeviceFlowAbort) {
    activeDeviceFlowAbort.abort()
    activeDeviceFlowAbort = null
  }
  const { endpoint, syncLimit } = configSnapshot()
  return setStatus({ kind: 'disconnected', endpoint, syncLimit, lastError: null })
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
  const { endpoint, syncLimit } = configSnapshot()
  if (!trimmed) {
    return setStatus({
      kind: 'disconnected',
      endpoint,
      syncLimit,
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
      syncLimit,
      lastError: 'Could not encrypt credential (safeStorage unavailable).'
    })
  }
  invalidateClient()
  try {
    const client = getClient()
    if (!client) throw new Error('client construction failed')
    await client.items.stats()
    return setStatus({
      kind: 'connected',
      endpoint,
      syncLimit,
      lastSyncedAt: null,
      lastError: null
    })
  } catch (err) {
    clearCredential()
    invalidateClient()
    const message = describeAuthError(err)
    return setStatus({ kind: 'disconnected', endpoint, syncLimit, lastError: message })
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
  const { endpoint, syncLimit } = configSnapshot()
  setStatus({ kind: 'disconnected', endpoint, syncLimit, lastError: null })
  return ensureStatus()
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
let syncInFlight: Promise<MymeStatus> | null = null
let activeAbort: AbortController | null = null

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

async function runSync(): Promise<MymeStatus> {
  const { endpoint, syncLimit } = configSnapshot()
  const status = ensureStatus()
  const previousLastSyncedAt = status.kind === 'connected' ? status.lastSyncedAt : null

  setStatus({
    kind: 'syncing',
    endpoint,
    syncLimit,
    phase: 'preparing',
    processed: 0,
    total: 0
  })

  activeAbort = new AbortController()
  const outcome = await syncRun({
    limit: syncLimit,
    signal: activeAbort.signal,
    onProgress: (e) => {
      setStatus({
        kind: 'syncing',
        endpoint,
        syncLimit,
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
      syncLimit,
      lastError: 'No credential available.'
    })
  }

  if (outcome.error && /Authentication/i.test(outcome.error)) {
    clearCredential()
    return setStatus({ kind: 'disconnected', endpoint, syncLimit, lastError: outcome.error })
  }

  const lastSyncedAt = outcome.ok ? outcome.finishedAt : previousLastSyncedAt
  const next = setStatus({
    kind: 'connected',
    endpoint,
    syncLimit,
    lastSyncedAt,
    lastError: outcome.ok ? null : outcome.error
  })
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

/**
 * Lift the just-issued token bundle out of the SDK's flow storage and
 * persist through our safeStorage-backed `tokens.ts`. The SDK persists
 * a JSON `PersistedTokens` blob under a key shaped
 * `myme.auth.tokens:<origin>:<client_id>` (see `device-flow.ts` in the
 * SDK); we read that key out of the storage instance we passed in to
 * `startDeviceFlow`, then write to our own credential file.
 */
async function persistTokensFromStorage(
  storage: TokenStorage,
  endpoint: string,
  clientId: string
): Promise<void> {
  const origin = new URL(endpoint).origin
  const storageKey = `myme.auth.tokens:${origin}:${clientId}`
  const raw = await storage.get(storageKey)
  if (!raw) {
    throw new Error('Device-flow tokens were not persisted by the SDK')
  }
  let parsed: Partial<OAuthTokenBundle>
  try {
    parsed = JSON.parse(raw) as Partial<OAuthTokenBundle>
  } catch (err) {
    throw new Error(
      `Could not parse device-flow tokens: ${err instanceof Error ? err.message : String(err)}`
    )
  }
  if (
    typeof parsed.access_token !== 'string' ||
    typeof parsed.refresh_token !== 'string' ||
    typeof parsed.access_expires_at !== 'number' ||
    typeof parsed.scope !== 'string'
  ) {
    throw new Error('Device-flow tokens are missing required fields')
  }
  const ok = writeCredential({
    kind: 'oauth',
    clientId,
    tokens: {
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
      access_expires_at: parsed.access_expires_at,
      scope: parsed.scope
    }
  })
  if (!ok) {
    throw new Error('Could not persist tokens (safeStorage unavailable).')
  }
}
