import { BrowserWindow } from 'electron'
import { MymeError, UnauthorizedError } from '@mymehq/sdk'
import type { MymeStatus, MymeSyncPhase } from '../../preload/api'
import { getConfig, setConfig } from '../config'
import { getClient, invalidateClient } from './client'
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

let currentStatus: MymeStatus = buildInitialStatus()

function buildInitialStatus(): MymeStatus {
  const endpoint = getConfig().myme.endpoint
  if (credentialExists() && readCredential() !== null) {
    return { kind: 'connected', endpoint, lastSyncedAt: null, lastError: null }
  }
  return { kind: 'disconnected', endpoint, lastError: null }
}

function setStatus(next: MymeStatus): void {
  currentStatus = next
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    win.webContents.send(STATUS_CHANNEL, next)
  }
}

export function getStatus(): MymeStatus {
  return currentStatus
}

export function setEndpoint(url: string): MymeStatus {
  const trimmed = url.trim()
  setConfig({ myme: { endpoint: trimmed } })
  invalidateClient()
  // Endpoint only changes the URL the next request will hit; the
  // credential still applies. If the card is currently `connected` but
  // the user changed the endpoint, the next sync attempt is what
  // surfaces a failure — we don't pre-emptively flip status here.
  setStatus({ ...currentStatus, endpoint: trimmed } as MymeStatus)
  return currentStatus
}

/** Transition to `connecting` so the renderer renders the API-key
 *  paste pane. The verification happens via `submitApiKey`. */
export function connect(): MymeStatus {
  const endpoint = getConfig().myme.endpoint
  setStatus({ kind: 'connecting', endpoint })
  return currentStatus
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
    setStatus({ kind: 'disconnected', endpoint, lastError: 'API key is empty.' })
    return currentStatus
  }
  // Temporarily stage the key so getClient() picks it up; persist only
  // after verification succeeds (so a failed attempt doesn't leave a
  // bad credential on disk).
  const persisted = writeCredential(trimmed)
  if (!persisted) {
    setStatus({
      kind: 'disconnected',
      endpoint,
      lastError: 'Could not encrypt credential (safeStorage unavailable).'
    })
    return currentStatus
  }
  invalidateClient()
  try {
    const client = getClient()
    if (!client) throw new Error('client construction failed')
    await client.items.stats()
    setStatus({ kind: 'connected', endpoint, lastSyncedAt: null, lastError: null })
    return currentStatus
  } catch (err) {
    clearCredential()
    invalidateClient()
    const message = describeAuthError(err)
    setStatus({ kind: 'disconnected', endpoint, lastError: message })
    return currentStatus
  }
}

export function disconnect(): MymeStatus {
  clearCredential()
  invalidateClient()
  setStatus({ kind: 'disconnected', endpoint: getConfig().myme.endpoint, lastError: null })
  return currentStatus
}

/** Sync engine integration point — milestone 4 lands the real
 *  implementation. For now `syncNow` is a noop that returns the
 *  current status. */
export async function syncNow(): Promise<MymeStatus> {
  return currentStatus
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
