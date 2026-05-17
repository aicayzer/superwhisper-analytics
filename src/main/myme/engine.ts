import { MymeError, UnauthorizedError, ValidationError, type CreateItemInput } from '@mymehq/sdk'
import type { Recording } from '@shared/types'
import { hydrate } from '../cache'
import { getClient, invalidateClient } from './client'
import { hashProjection, projectRecording } from './projection'
import { loadState, saveState, type SyncState, type SyncStateEntry } from './state'

/**
 * Sync engine — pushes the local recording set into a Myme tenant.
 *
 * Diff semantics from [[Myme integration — May 2026]] §"How it writes":
 *
 *   - in current ∧ ¬state           → bulk-upsert (created)
 *   - in current ∧ state ∧ Δhash    → bulk-upsert (updated)
 *   - ¬current ∧ state              → transition(trashed) (soft-delete)
 *   - match                          → no-op
 *
 * `(source, source_id)` is the natural key — repeated upserts of the
 * same `source_id` resolve as updates, never duplicates. The content
 * hash gates the wire call: a recording whose projection didn't change
 * since the last push doesn't go out.
 *
 * Milestone 4 ships recording sync. Sessions land in milestone 6 — the
 * `state.sessions` map is untouched here.
 */

/**
 * How many `items.upsert` requests run concurrently against Myme.
 *
 * `items.bulk` is admin-only — see the running log. For a member-role
 * credential we drive N parallel singular upserts instead. 10 keeps us
 * comfortably under the rate-limit ceiling (2000 req/min observed) and
 * is fast enough that the initial 11.8k-recording sync completes in
 * ~minutes rather than tens of minutes.
 */
const UPSERT_CONCURRENCY = 10

/** Reason a sync attempt was skipped without contacting the server. */
type SkipReason = 'no-client'

export interface SyncOutcome {
  ok: boolean
  /** ISO timestamp on success; null when skipped or failed. */
  finishedAt: string | null
  /** Counts for the run — useful for logs and the Settings card. */
  counts: {
    created: number
    updated: number
    softDeleted: number
    noop: number
    errored: number
  }
  /** Populated on failure; null on success. */
  error: string | null
  /** When the engine bailed before contacting the server. */
  skipped: SkipReason | null
}

export type SyncProgressEvent =
  | { phase: 'preparing'; processed: 0; total: number }
  | { phase: 'recordings'; processed: number; total: number }
  | { phase: 'sessions'; processed: number; total: number }

export interface SyncOptions {
  /** Push channel for progress emissions. */
  onProgress?: (e: SyncProgressEvent) => void
  /** Override the recording source. Tests inject a fixed set; production
   *  reads from the in-memory cache. */
  recordingsOverride?: Recording[]
}

/**
 * Run one sync pass. Returns the outcome — never throws, so callers
 * can confidently `await syncRun(...)` without try/catch around it.
 *
 * Auth failures are signalled via the `auth-failed` outcome so the
 * caller (the integration's index module) can flip the card status to
 * `disconnected` and clear the credential.
 */
export async function syncRun(opts: SyncOptions = {}): Promise<SyncOutcome> {
  const maybeClient = getClient()
  if (!maybeClient) {
    return {
      ok: false,
      finishedAt: null,
      counts: { created: 0, updated: 0, softDeleted: 0, noop: 0, errored: 0 },
      error: null,
      skipped: 'no-client'
    }
  }
  // Hoist into a const that's non-null in every closure below — TS can't
  // narrow `client` from the `if (!client)` early return through the
  // pushOne / soft-delete closures.
  const client = maybeClient

  const recordings = opts.recordingsOverride ?? hydrate().recordings
  const state = loadState()

  opts.onProgress?.({ phase: 'preparing', processed: 0, total: recordings.length })

  // Build the diff. We hold the projections in memory so the state file
  // update at the end has the new hash for every successfully-pushed
  // recording without re-projecting.
  type Item = { sourceId: string; hash: string; payload: CreateItemInput }
  const toUpsert: Item[] = []
  const seenSourceIds = new Set<string>()

  for (const r of recordings) {
    const p = projectRecording(r)
    const hash = hashProjection(p)
    seenSourceIds.add(p.source_id)
    const prev = state.recordings[p.source_id]
    if (prev && prev.hash === hash) continue
    toUpsert.push({
      sourceId: p.source_id,
      hash,
      payload: {
        type: p.type,
        source_id: p.source_id,
        tier: p.tier,
        properties: p.properties
      }
    })
  }

  // Soft-delete list: recordings tracked in state but absent from
  // current. Sessions are intentionally not handled in this pass.
  const toSoftDelete = Object.keys(state.recordings).filter((id) => !seenSourceIds.has(id))

  const counts = {
    created: 0,
    updated: 0,
    softDeleted: 0,
    noop: recordings.length - toUpsert.length,
    errored: 0
  }
  let lastError: string | null = null
  const successesById = new Map<string, SyncStateEntry>()

  // ── Upserts ───────────────────────────────────────────────────────
  // Parallel singular `items.upsert` calls, capped at
  // `UPSERT_CONCURRENCY`. `items.bulk` would be one call per chunk, but
  // it's admin-only — see the running log.
  const pushedAt = new Date().toISOString()
  let processed = 0
  let halted = false
  let authFailed = false
  let validationFailed: ValidationError | null = null

  async function pushOne(item: Item): Promise<void> {
    if (halted) return
    try {
      const { item: stored, created } = await client.items.upsert(item.payload)
      if (created) counts.created += 1
      else counts.updated += 1
      successesById.set(item.sourceId, {
        hash: item.hash,
        itemId: stored.id,
        lastPushedAt: pushedAt
      })
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        authFailed = true
        halted = true
        return
      }
      if (err instanceof ValidationError) {
        validationFailed = err
        halted = true
        return
      }
      counts.errored += 1
      lastError = describeError(err)
      console.warn(`[myme] upsert failed for ${item.sourceId}:`, err)
    } finally {
      processed += 1
      if (processed % UPSERT_CONCURRENCY === 0 || processed === toUpsert.length) {
        opts.onProgress?.({ phase: 'recordings', processed, total: toUpsert.length })
      }
    }
  }

  // Simple sliding-window concurrency. Promise.all with chunk slicing
  // would also work; this shape keeps the channel saturated as faster
  // requests complete instead of waiting for the slowest in each chunk.
  const inFlight: Set<Promise<void>> = new Set()
  for (const item of toUpsert) {
    if (halted) break
    const p = pushOne(item).finally(() => inFlight.delete(p))
    inFlight.add(p)
    if (inFlight.size >= UPSERT_CONCURRENCY) {
      await Promise.race(inFlight)
    }
  }
  await Promise.all(inFlight)

  if (authFailed) return failAuth(counts, successesById, state)
  if (validationFailed) return failValidation(validationFailed, counts, successesById, state)

  opts.onProgress?.({
    phase: 'recordings',
    processed: toUpsert.length,
    total: toUpsert.length
  })

  // ── Soft-deletes ──────────────────────────────────────────────────
  // Recordings tracked in state but absent from current. The state
  // file stores the server-assigned item id from the upsert response,
  // so we can transition by id directly — no list+filter dance. Done
  // serially because the dataset has very few disk-side deletes day to
  // day.
  const softDeletedSourceIds = new Set<string>()
  for (const sourceId of toSoftDelete) {
    const prev = state.recordings[sourceId]
    if (!prev) {
      softDeletedSourceIds.add(sourceId)
      continue
    }
    try {
      await client.items.transition(prev.itemId, 'trashed')
      counts.softDeleted += 1
      softDeletedSourceIds.add(sourceId)
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        return failAuth(counts, successesById, state)
      }
      // 404 on the item id means it's already gone — fine, treat as a
      // successful soft-delete and drop from state. Other errors stay
      // tracked so we retry next pass.
      if (err instanceof MymeError && /not.?found|404/i.test(err.message)) {
        softDeletedSourceIds.add(sourceId)
        continue
      }
      counts.errored += 1
      lastError = describeError(err)
      console.warn(`[myme] soft-delete failed for ${sourceId}:`, err)
    }
  }

  // ── Persist new state ─────────────────────────────────────────────
  const nextRecordings: Record<string, SyncStateEntry> = { ...state.recordings }
  for (const [sourceId, entry] of successesById) {
    nextRecordings[sourceId] = entry
  }
  for (const sourceId of softDeletedSourceIds) {
    delete nextRecordings[sourceId]
  }
  const nextState: SyncState = {
    ...state,
    recordings: nextRecordings,
    lastFullSyncAt: pushedAt
  }
  saveState(nextState)

  return {
    ok: counts.errored === 0,
    finishedAt: pushedAt,
    counts,
    error: lastError,
    skipped: null
  }
}

function failAuth(
  counts: SyncOutcome['counts'],
  successes: Map<string, SyncStateEntry>,
  state: SyncState
): SyncOutcome {
  // Best-effort persist of any successes that landed before the auth
  // failure — we'd otherwise lose track of them and re-push next time.
  // Hash-equal re-pushes are no-ops on the server (idempotent upsert)
  // so this is a strict improvement.
  if (successes.size > 0) {
    const nextRecordings = { ...state.recordings }
    for (const [sourceId, entry] of successes) nextRecordings[sourceId] = entry
    saveState({ ...state, recordings: nextRecordings })
  }
  invalidateClient()
  return {
    ok: false,
    finishedAt: null,
    counts,
    error: 'Authentication failed — reconnect to Myme.',
    skipped: null
  }
}

function failValidation(
  err: ValidationError,
  counts: SyncOutcome['counts'],
  successes: Map<string, SyncStateEntry>,
  state: SyncState
): SyncOutcome {
  if (successes.size > 0) {
    const nextRecordings = { ...state.recordings }
    for (const [sourceId, entry] of successes) nextRecordings[sourceId] = entry
    saveState({ ...state, recordings: nextRecordings })
  }
  return {
    ok: false,
    finishedAt: null,
    counts,
    error: `Schema drift: ${err.message}. Re-register types and retry.`,
    skipped: null
  }
}

function describeError(err: unknown): string {
  if (err instanceof MymeError) return err.message
  if (err instanceof Error) return err.message
  return 'Unknown error.'
}
