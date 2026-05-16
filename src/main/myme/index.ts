import { BrowserWindow } from 'electron'
import type { MymeStatus } from '../../preload/api'
import { getConfig, setConfig } from '../config'

/**
 * Public surface of the Myme integration module — used by `ipc.ts`.
 *
 * State machine (mirrors `MymeStatus`):
 *
 *   disconnected ─ connect ─▶ connecting
 *                                 │
 *                                 ▼  (device flow approved)
 *   disconnected ◀── disconnect ─ connected ◀──┐
 *                                 │            │ (sync complete)
 *                                 ▼            │
 *                              syncing ────────┘
 *
 * The `disabled` state (demo mode on, or no recordings path) is composed
 * in the renderer from `configStore` — main always reports the engine's
 * actual state regardless.
 *
 * Milestone 2 ships the wire shape + status broadcaster only.
 * `connect` / `disconnect` / `syncNow` are stubbed: they update status
 * to a deterministic placeholder so the renderer can render every card
 * state, but no real OAuth or sync runs yet. Milestones 3+ fill these in.
 */

const STATUS_CHANNEL = 'myme:status'

let currentStatus: MymeStatus = buildInitialStatus()

function buildInitialStatus(): MymeStatus {
  const endpoint = getConfig().myme.endpoint
  // Token presence (and thus the connected vs disconnected boot state)
  // is wired in milestone 3. For now we always start disconnected.
  return { kind: 'disconnected', endpoint }
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
  // Keep the rest of the current status shape — only the endpoint
  // changes. Today that's always `disconnected`; future states (e.g.
  // `connected` with a stale endpoint) become a milestone-3 concern.
  setStatus({ ...currentStatus, endpoint: trimmed } as MymeStatus)
  return currentStatus
}

/** Stub — milestone 3 wires the real OAuth device flow. */
export async function connect(): Promise<MymeStatus> {
  const endpoint = getConfig().myme.endpoint
  setStatus({
    kind: 'connecting',
    endpoint,
    userCode: 'XXXX-XXXX',
    verificationUri: `${endpoint}/oauth/device`,
    verificationUriComplete: `${endpoint}/oauth/device?user_code=XXXX-XXXX`,
    expiresAt: new Date(Date.now() + 10 * 60_000).toISOString()
  })
  return currentStatus
}

/** Stub — milestone 3 wires the real disconnect path (revoke token,
 *  clear sync state, etc.). */
export async function disconnect(): Promise<MymeStatus> {
  setStatus({ kind: 'disconnected', endpoint: getConfig().myme.endpoint })
  return currentStatus
}

/** Stub — milestone 4 wires the sync engine. */
export async function syncNow(): Promise<MymeStatus> {
  // No-op while disconnected so the stub respects the state machine.
  if (currentStatus.kind !== 'connected') return currentStatus
  return currentStatus
}
