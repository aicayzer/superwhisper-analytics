import { BrowserWindow } from 'electron'
import { MymeError, UnauthorizedError } from '@mymehq/sdk'
import type { MymeStatus, MymeSyncPhase } from '../../preload/api'
import { getConfig, setConfig } from '../config'
import { getClient, invalidateClient } from './client'
import { syncRun } from './engine'
import { clearState } from './state'
import { clearCredential, credentialExists, readCredential, writeCredential } from './tokens'

/**
 * Public surface of the Myme integration module — used by `ipc.ts`.
 *
 * State machine (mirrors `MymeStatus`):
 *
 *   disconnected ── connect ──────▶ connecting
 *                                       │ submitApiKey
 *                                       ▼  (verify success)
 *   disconnected ◀── disconnect ── connected ◀──┐
 *                                       │       │ (sync complete)
 *                                       ▼       │
 *                                    syncing ───┘
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
 * v1 uses an API key rather than the device flow the spec mandates —
 * see [[Myme issues — running log]] for why. The state machine here
 * is identical to what device flow would need; the difference is what
 * the user types into the connecting pane.
 */

const STATUS_CHANNEL = 'myme:status'

// Lazy-initialised so the boot-time probe runs after `app.ready` —
// `safeStorage.isEncryptionAvailable()` returns false until then on
// macOS, which would mis-classify a connected user as disconnected on
// every launch.
let currentStatus: MymeStatus | null = null

function buildInitialStatus(): MymeStatus {
  const endpoint = getConfig().myme.endpoint
  if (credentialExists() && readCredential() !== null) {
    return { kind: 'connected', endpoint, lastSyncedAt: null, lastError: null }
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
  setConfig({ myme: { endpoint: trimmed } })
  invalidateClient()
  // Endpoint only changes the URL the next request will hit; the
  // credential still applies. If the card is currently `connected` but
  // the user changed the endpoint, the next sync attempt is what
  // surfaces a failure — we don't pre-emptively flip status here.
  setStatus({ ...ensureStatus(), endpoint: trimmed } as MymeStatus)
  return ensureStatus()
}

/** Transition to `connecting` so the renderer renders the API-key
 *  paste pane. The verification happens via `submitApiKey`. */
export function connect(): MymeStatus {
  const endpoint = getConfig().myme.endpoint
  setStatus({ kind: 'connecting', endpoint })
  return ensureStatus()
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
  const endpoint = getConfig().myme.endpoint
  if (!trimmed) {
    return setStatus({ kind: 'disconnected', endpoint, lastError: 'API key is empty.' })
  }
  // Temporarily stage the key so getClient() picks it up; persist only
  // after verification succeeds (so a failed attempt doesn't leave a
  // bad credential on disk).
  const persisted = writeCredential(trimmed)
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
    return setStatus({ kind: 'connected', endpoint, lastSyncedAt: null, lastError: null })
  } catch (err) {
    clearCredential()
    invalidateClient()
    const message = describeAuthError(err)
    return setStatus({ kind: 'disconnected', endpoint, lastError: message })
  }
}

export function disconnect(): MymeStatus {
  clearCredential()
  clearState()
  invalidateClient()
  setStatus({ kind: 'disconnected', endpoint: getConfig().myme.endpoint, lastError: null })
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

export async function syncNow(): Promise<MymeStatus> {
  if (syncInFlight) return syncInFlight
  const status = ensureStatus()
  if (status.kind !== 'connected') return status
  syncInFlight = runSync()
  try {
    return await syncInFlight
  } finally {
    syncInFlight = null
  }
}

async function runSync(): Promise<MymeStatus> {
  const endpoint = getConfig().myme.endpoint
  const status = ensureStatus()
  const previousLastSyncedAt = status.kind === 'connected' ? status.lastSyncedAt : null

  setStatus({ kind: 'syncing', endpoint, phase: 'preparing', processed: 0, total: 0 })

  const outcome = await syncRun({
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
    return setStatus({ kind: 'disconnected', endpoint, lastError: 'No credential available.' })
  }

  if (outcome.error && /Authentication/i.test(outcome.error)) {
    clearCredential()
    return setStatus({ kind: 'disconnected', endpoint, lastError: outcome.error })
  }

  const lastSyncedAt = outcome.ok ? outcome.finishedAt : previousLastSyncedAt
  const next = setStatus({
    kind: 'connected',
    endpoint,
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

/** Convenience for the engine: emit progress while syncing. */
export function emitSyncing(phase: MymeSyncPhase, processed: number, total: number): void {
  setStatus({ kind: 'syncing', endpoint: getConfig().myme.endpoint, phase, processed, total })
}
