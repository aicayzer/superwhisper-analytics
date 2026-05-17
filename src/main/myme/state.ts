import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

/**
 * Persistent sync-state file: per-source_id content hash + last-pushed
 * timestamp. Lives alongside `config.json` in `<userData>`.
 *
 * Engine state, not user-preference state — keeping it separate from
 * `config.json` so a `Reset app` action doesn't wipe sync state, and
 * conversely so engine-state changes don't churn the config file's
 * mtime on every reindex.
 *
 * Atomic write via write-temp + rename so a crash mid-write can't
 * leave a half-written JSON file. The whole map is rewritten on every
 * sync — typical size is on the order of (recording_count * 80 bytes)
 * which is still under 1MB for 11k recordings, so chunked persistence
 * isn't needed.
 */

const STATE_FILE = 'myme-sync.json'
const SCHEMA_VERSION = 1

export interface SyncStateEntry {
  /** SHA-256 hash of the projected payload — see `projection.ts`. */
  hash: string
  /** Server-assigned item id, captured from the bulk-upsert response.
   *  Lets the soft-delete path call `transition(id, 'trashed')` without
   *  a separate list lookup to resolve the natural key. */
  itemId: string
  /** ISO timestamp of the last successful push. */
  lastPushedAt: string
}

export interface SyncState {
  schemaVersion: number
  /** Keyed by `source_id`. */
  recordings: Record<string, SyncStateEntry>
  /** Keyed by `source_id`. */
  sessions: Record<string, SyncStateEntry>
  /** Wall-clock ISO of the last completed full-sync pass. Used for the
   *  "last synced" timestamp on the Settings card. Null until the
   *  first run completes. */
  lastFullSyncAt: string | null
}

function filePath(): string {
  return join(app.getPath('userData'), STATE_FILE)
}

function emptyState(): SyncState {
  return {
    schemaVersion: SCHEMA_VERSION,
    recordings: {},
    sessions: {},
    lastFullSyncAt: null
  }
}

/** Read the sync state from disk. Returns an empty state if the file
 *  is missing or unreadable; never throws — Myme is optional. */
export function loadState(): SyncState {
  const path = filePath()
  if (!existsSync(path)) return emptyState()
  try {
    const raw = readFileSync(path, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<SyncState>
    if (typeof parsed !== 'object' || parsed === null) return emptyState()
    return {
      schemaVersion: SCHEMA_VERSION,
      recordings: isRecordOfEntries(parsed.recordings) ? parsed.recordings : {},
      sessions: isRecordOfEntries(parsed.sessions) ? parsed.sessions : {},
      lastFullSyncAt: typeof parsed.lastFullSyncAt === 'string' ? parsed.lastFullSyncAt : null
    }
  } catch (err) {
    console.warn('[myme] failed to read sync state, starting fresh:', err)
    return emptyState()
  }
}

/** Atomically write the sync state to disk. Returns true on success. */
export function saveState(state: SyncState): boolean {
  try {
    const path = filePath()
    mkdirSync(dirname(path), { recursive: true })
    const tmp = path + '.tmp'
    writeFileSync(tmp, JSON.stringify(state, null, 2), 'utf-8')
    renameSync(tmp, path)
    return true
  } catch (err) {
    console.warn('[myme] failed to write sync state:', err)
    return false
  }
}

/** Delete the sync-state file — used on disconnect so a fresh connect
 *  starts with an empty state map (every recording looks new to the
 *  diff). The natural-key upsert in Myme makes the resulting full push
 *  a bandwidth cost, not a correctness one. */
export function clearState(): void {
  const path = filePath()
  if (existsSync(path)) {
    try {
      unlinkSync(path)
    } catch (err) {
      console.warn('[myme] failed to delete sync state:', err)
    }
  }
}

function isRecordOfEntries(value: unknown): value is Record<string, SyncStateEntry> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  for (const v of Object.values(value)) {
    if (
      typeof v !== 'object' ||
      v === null ||
      typeof (v as SyncStateEntry).hash !== 'string' ||
      typeof (v as SyncStateEntry).itemId !== 'string' ||
      typeof (v as SyncStateEntry).lastPushedAt !== 'string'
    ) {
      return false
    }
  }
  return true
}
