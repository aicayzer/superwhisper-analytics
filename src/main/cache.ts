import { buildFillers } from '@shared/text-metrics'
import type { Aggregates, HydratePayload, Recording } from '@shared/types'
import { computeAll, emptyAggregates } from './aggregates'
import { getConfig, isPathValid, setConfig } from './config'
import { scan } from './scanner'

/**
 * In-memory cache of the last scanned recordings + their aggregates.
 *
 * Single global module-state — Electron's main process is per-app, so
 * this is fine. Renderer asks for the bundle via `hydrate()`. If the
 * configured path has changed since the last scan (or no scan has yet
 * happened) the call rescans transparently.
 *
 * 11k recordings + their aggregates fit comfortably in main's heap, so
 * we don't bother with on-disk caching or pagination — the IPC payload
 * is large but ships in one round-trip.
 */

let recordings: Recording[] = []
let aggregates: Aggregates = emptyAggregates()
let indexedAt: string | null = null
let lastScannedPath: string | null = null

function buildPayload(error: string | null = null): HydratePayload {
  return {
    recordings,
    aggregates,
    indexedAt: indexedAt ?? '',
    count: recordings.length,
    error
  }
}

function clear(): void {
  recordings = []
  aggregates = emptyAggregates()
  indexedAt = null
  lastScannedPath = null
}

function rescan(): HydratePayload {
  const config = getConfig()
  const path = config.superwhisperPath
  if (!path) {
    clear()
    return buildPayload('No recordings folder configured.')
  }
  if (!isPathValid(path)) {
    clear()
    return buildPayload(`Path not found: ${path}`)
  }

  const t0 = Date.now()
  const result = scan(path, config.fillerWords)
  const t1 = Date.now()
  recordings = result.recordings
  aggregates = computeAll(recordings, new Date())
  indexedAt = new Date().toISOString()
  lastScannedPath = path
  const t2 = Date.now()
  console.log(
    `[cache] scanned ${recordings.length} recordings in ${t1 - t0}ms, aggregated in ${t2 - t1}ms` +
      (result.skipped ? ` (${result.skipped} folders without meta.json)` : '') +
      (result.errors ? ` (${result.errors} parse errors)` : '')
  )
  return buildPayload(null)
}

/**
 * Return cached data, rescanning lazily if the cache is empty or the
 * configured path has changed since the last scan.
 */
export function hydrate(): HydratePayload {
  const path = getConfig().superwhisperPath
  if (indexedAt === null || path !== lastScannedPath) return rescan()
  return buildPayload(null)
}

/** Force a fresh scan. Always rebuilds, even if the path hasn't changed. */
export function reindex(): HydratePayload {
  return rescan()
}

/**
 * Replace the active filler-phrase list and re-derive the cached
 * filler-derived fields + aggregates. No disk re-read — we already
 * have the raw transcripts in memory, so the recompute is purely
 * CPU-bound (~150ms on 11k recordings).
 */
export function setFillerWords(words: string[]): HydratePayload {
  const updated = setConfig({ fillerWords: words })
  for (const r of recordings) {
    const f = buildFillers(r.result, updated.fillerWords)
    r.fillerCount = f.count
    r.fillerBreakdown = f.breakdown
  }
  aggregates = computeAll(recordings, new Date())
  return buildPayload(null)
}
