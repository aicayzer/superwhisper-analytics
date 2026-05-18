import os from 'os'
import { MymeError, UnauthorizedError, ValidationError, type CreateItemInput } from '@mymehq/sdk'
import type { Recording } from '@shared/types'
import { hydrate } from '../cache'
import { getClient, invalidateClient } from './client'
import { defaultMapping, type MymeMapping } from './mapping'
import { hashProjection, projectRecording, projectSession } from './projection'
import { ensureTypesRegistered } from './registration'
import { DEFAULT_GAP_THRESHOLD_MINUTES, groupIntoSessions } from './sessions'
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
  /** Cap the sync to the N most-recent recordings (sorted newest-first
   *  by the scanner). 0 / omit / negative → sync the full set. Used by
   *  the Settings card's "Push N most recent" testing knob so a smoke
   *  run hits ~25 recordings instead of 11.7k. The diff still trims
   *  the cap to recordings that haven't been synced yet. */
  limit?: number
  /** Cancellation signal. Checked between every `items.upsert` /
   *  `items.transition` call. On abort the engine persists any
   *  successes already landed and returns with `error = "Cancelled"`. */
  signal?: AbortSignal
  /** Active mapping config — defines what the engine projects
   *  recordings + sessions into. Defaults to the bundled mapping when
   *  omitted (used by tests; production threads the persisted mapping
   *  in from `index.ts`). */
  mapping?: MymeMapping
  /** Optional mode filter — only sync recordings whose `modeName` is
   *  in this set. `null` / omit → no filter. Empty array → no
   *  recordings sync (degenerate but legal: the renderer's "select all"
   *  produces a fresh set, not an empty one). */
  modeFilter?: string[] | null
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

  const mapping = opts.mapping ?? defaultMapping()
  const modeFilter = opts.modeFilter ?? null

  // Pre-flight: make sure the mapping's target types exist server-side.
  // Bundled / authored types get registered if missing; existing types
  // are taken on trust. If registration fails (e.g. server unreachable)
  // we surface that as the sync error rather than blocking the engine
  // from running the projection step — the upserts will fail with a
  // clearer message anyway.
  try {
    await ensureTypesRegistered(client, mapping)
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return failAuth(
        { created: 0, updated: 0, softDeleted: 0, noop: 0, errored: 0 },
        new Map(),
        loadState()
      )
    }
    console.warn('[myme] type registration failed:', err)
    // Fall through — the upsert will surface the real error.
  }

  const fullRecordings = opts.recordingsOverride ?? hydrate().recordings
  // Apply the mode filter before the limit so the cap counts post-
  // filter, not pre — otherwise narrowing to "only command" with a
  // cap of 100 could return zero results from a recordings tail
  // dominated by dictation.
  const filteredRecordings = modeFilter
    ? fullRecordings.filter((r) => modeFilter.includes(r.modeName))
    : fullRecordings
  // Apply the "push N most-recent" testing knob. Scanner sorts
  // newest-first, so a plain `slice(0, n)` is the right shape — keeps
  // the smoke close to "what would happen if you'd only kept these
  // recordings". A non-positive limit syncs the full set.
  const limit = typeof opts.limit === 'number' && opts.limit > 0 ? opts.limit : null
  const recordings = limit ? filteredRecordings.slice(0, limit) : filteredRecordings
  const state = loadState()

  opts.onProgress?.({ phase: 'preparing', processed: 0, total: recordings.length })

  // Build the diff. We hold the projections in memory so the state file
  // update at the end has the new hash for every successfully-pushed
  // recording without re-projecting.
  type Item = { sourceId: string; hash: string; payload: CreateItemInput }
  const toUpsert: Item[] = []
  const seenSourceIds = new Set<string>()

  for (const r of recordings) {
    const p = projectRecording(r, mapping.recording)
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
        device: os.hostname(),
        properties: p.properties
      }
    })
  }

  // Soft-delete list: recordings tracked in state but absent from
  // current. Skipped when a sync cap is in effect — every recording
  // past the cap would be falsely "missing" from the view, which would
  // trash the whole tail. Only the uncapped path can authoritatively
  // detect disk-deletes; the cap surfaces this trade-off in the UI.
  const toSoftDelete = limit
    ? []
    : Object.keys(state.recordings).filter((id) => !seenSourceIds.has(id))

  const counts = {
    created: 0,
    updated: 0,
    softDeleted: 0,
    noop: recordings.length - toUpsert.length,
    errored: 0
  }
  let lastError: string | null = null
  let cancelled = false
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
    // Pre-flight cancellation check — once the signal fires, we stop
    // starting fresh requests. In-flight ones still finish (we can't
    // abort an `items.upsert` call mid-flight via the public SDK), but
    // their successes still record so the next sync diff-skips them.
    if (opts.signal?.aborted) {
      cancelled = true
      halted = true
      return
    }
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
      // If the user cancelled while this request was in flight,
      // suppress the resulting timeout / network error — the cancel
      // outcome is the more honest signal. Without this, the card's
      // last-error row would surface the transport error rather than
      // "Cancelled" and the user would be left wondering whether
      // their click did anything.
      if (opts.signal?.aborted) {
        cancelled = true
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
    if (halted || opts.signal?.aborted) {
      if (opts.signal?.aborted) cancelled = true
      break
    }
    const p = pushOne(item).finally(() => inFlight.delete(p))
    inFlight.add(p)
    if (inFlight.size >= UPSERT_CONCURRENCY) {
      await Promise.race(inFlight)
    }
  }
  await Promise.all(inFlight)

  if (authFailed) return failAuth(counts, successesById, state)
  if (validationFailed) return failValidation(validationFailed, counts, successesById, state)
  // `cancelled` is checked again after the soft-delete pass — the loop
  // we just exited only sets the flag if the *queue* drained on an
  // aborted signal, not if a push was actively cancelled. Either way,
  // the final cancelled branch below sees it.

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
    if (opts.signal?.aborted) {
      cancelled = true
      break
    }
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
  if (cancelled) {
    // Persist what we've got from this run's upserts + soft-deletes so
    // the next sync's diff sees the correct delta.
    const partialRecordings: Record<string, SyncStateEntry> = { ...state.recordings }
    for (const [sourceId, entry] of successesById) partialRecordings[sourceId] = entry
    for (const sourceId of softDeletedSourceIds) delete partialRecordings[sourceId]
    saveState({ ...state, recordings: partialRecordings })
    return {
      ok: false,
      finishedAt: null,
      counts,
      error: 'Cancelled',
      skipped: null
    }
  }

  // Build the next-recordings state up-front so the session pass can
  // resolve recording itemIds (for `parent-of` edges) from a
  // single coherent map of "everything that successfully landed,
  // including this run's upserts".
  const nextRecordings: Record<string, SyncStateEntry> = { ...state.recordings }
  for (const [sourceId, entry] of successesById) {
    nextRecordings[sourceId] = entry
  }
  for (const sourceId of softDeletedSourceIds) {
    delete nextRecordings[sourceId]
  }

  // ── Sessions ──────────────────────────────────────────────────────
  // Derived from the current recording set, full-replaced every run.
  // Threshold change yields fresh source_ids → fresh items → the diff
  // naturally trash-and-re-mints. Skipped while a sync cap is in
  // effect: a partial recording view would mint malformed session
  // groups (and trash legitimate prior sessions). Sessions are an
  // all-or-nothing concept; the cap-surface UI flags the trade-off.
  const sessionOutcome = limit
    ? {
        created: 0,
        updated: 0,
        softDeleted: 0,
        errored: 0,
        noop: 0,
        error: null,
        authFailed: false,
        nextSessions: state.sessions
      }
    : await syncSessions({
        client,
        recordings,
        state,
        recordingIds: nextRecordings,
        pushedAt,
        binding: mapping.session,
        onProgress: opts.onProgress,
        signal: opts.signal
      })
  counts.created += sessionOutcome.created
  counts.updated += sessionOutcome.updated
  counts.softDeleted += sessionOutcome.softDeleted
  counts.errored += sessionOutcome.errored
  counts.noop += sessionOutcome.noop
  if (sessionOutcome.error && !lastError) lastError = sessionOutcome.error
  if (sessionOutcome.authFailed) {
    return failAuth(counts, successesById, {
      ...state,
      recordings: nextRecordings,
      sessions: sessionOutcome.nextSessions
    })
  }
  if (sessionOutcome.cancelled) {
    // Persist partial progress including the recordings half so we
    // don't redo work we've already done.
    saveState({
      ...state,
      recordings: nextRecordings,
      sessions: sessionOutcome.nextSessions
    })
    return {
      ok: false,
      finishedAt: null,
      counts,
      error: 'Cancelled',
      skipped: null
    }
  }

  // ── Persist new state ─────────────────────────────────────────────
  const nextState: SyncState = {
    ...state,
    recordings: nextRecordings,
    sessions: sessionOutcome.nextSessions,
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

interface SessionSyncOutcome {
  created: number
  updated: number
  softDeleted: number
  errored: number
  noop: number
  error: string | null
  authFailed: boolean
  cancelled?: boolean
  nextSessions: Record<string, SyncStateEntry>
}

async function syncSessions(opts: {
  client: ReturnType<typeof getClient> & object
  recordings: Recording[]
  state: SyncState
  recordingIds: Record<string, SyncStateEntry>
  pushedAt: string
  binding: MymeMapping['session']
  onProgress?: SyncOptions['onProgress']
  signal?: AbortSignal
}): Promise<SessionSyncOutcome & { cancelled?: boolean }> {
  const { client, recordings, state, recordingIds, pushedAt, binding, onProgress, signal } = opts
  const out: SessionSyncOutcome = {
    created: 0,
    updated: 0,
    softDeleted: 0,
    errored: 0,
    noop: 0,
    error: null,
    authFailed: false,
    nextSessions: { ...state.sessions }
  }

  const groups = groupIntoSessions(recordings, DEFAULT_GAP_THRESHOLD_MINUTES)
  type SessionItem = {
    sourceId: string
    hash: string
    payload: CreateItemInput & { edges?: Record<string, string[]> }
  }
  const toUpsert: SessionItem[] = []
  const seenSourceIds = new Set<string>()

  for (const g of groups) {
    const projection = projectSession(g, binding)
    const hash = hashProjection(projection)
    seenSourceIds.add(projection.source_id)
    const prev = state.sessions[projection.source_id]
    if (prev && prev.hash === hash) {
      out.noop += 1
      continue
    }
    // Resolve the recording itemIds the session's `parent-of` edges
    // should point at. If a recording's still pending (its
    // upsert failed earlier in the run, or it isn't in state yet),
    // skip it from the edge list — we'd rather mint a session with a
    // partial edge set than fail the whole session push.
    const recordingItemIds: string[] = []
    for (const rid of g.recordingIds) {
      const entry = recordingIds[rid]
      if (entry) recordingItemIds.push(entry.itemId)
    }
    toUpsert.push({
      sourceId: projection.source_id,
      hash,
      payload: {
        type: projection.type,
        source_id: projection.source_id,
        tier: projection.tier,
        properties: projection.properties,
        edges: { 'parent-of': recordingItemIds }
      }
    })
  }

  const toSoftDelete = Object.keys(state.sessions).filter((id) => !seenSourceIds.has(id))

  // Sessions are far fewer than recordings (typical: dozens) so a
  // serial loop is fine.
  for (let i = 0; i < toUpsert.length; i += 1) {
    if (signal?.aborted) {
      out.cancelled = true
      return out
    }
    const item = toUpsert[i]
    if (!item) continue
    onProgress?.({ phase: 'sessions', processed: i, total: toUpsert.length })
    try {
      const { item: stored, created } = await client.items.upsert(item.payload)
      if (created) out.created += 1
      else out.updated += 1
      out.nextSessions[item.sourceId] = {
        hash: item.hash,
        itemId: stored.id,
        lastPushedAt: pushedAt
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        out.authFailed = true
        return out
      }
      out.errored += 1
      out.error = err instanceof Error ? err.message : 'Unknown error.'
      console.warn(`[myme] session upsert failed for ${item.sourceId}:`, err)
    }
  }
  onProgress?.({ phase: 'sessions', processed: toUpsert.length, total: toUpsert.length })

  for (const sourceId of toSoftDelete) {
    if (signal?.aborted) {
      out.cancelled = true
      return out
    }
    const prev = state.sessions[sourceId]
    if (!prev) {
      delete out.nextSessions[sourceId]
      continue
    }
    try {
      await client.items.transition(prev.itemId, 'trashed')
      out.softDeleted += 1
      delete out.nextSessions[sourceId]
    } catch (err) {
      if (err instanceof UnauthorizedError) {
        out.authFailed = true
        return out
      }
      if (err instanceof MymeError && /not.?found|404/i.test(err.message)) {
        delete out.nextSessions[sourceId]
        continue
      }
      out.errored += 1
      out.error = err instanceof Error ? err.message : out.error
      console.warn(`[myme] session soft-delete failed for ${sourceId}:`, err)
    }
  }

  return out
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
