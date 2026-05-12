import { buildFillers } from '@shared/text-metrics'
import type { Aggregates, HydratePayload, Recording } from '@shared/types'
import { computeAll, emptyAggregates } from './aggregates'
import { getConfig, isPathValid, setConfig } from './config'
import { buildDemoRecordings } from './demo'
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
let lastDemoMode: boolean | null = null
let scanErrors = 0
let scanSkipped = 0

function buildPayload(error: string | null = null): HydratePayload {
  return {
    recordings,
    aggregates,
    indexedAt: indexedAt ?? '',
    count: recordings.length,
    error,
    scanErrors,
    scanSkipped
  }
}

function clear(): void {
  recordings = []
  aggregates = emptyAggregates()
  indexedAt = null
  lastScannedPath = null
  lastDemoMode = null
  scanErrors = 0
  scanSkipped = 0
}

function rescan(): HydratePayload {
  const config = getConfig()

  // Demo data is served in two cases:
  //   1. `config.demoMode` is on (user opted in via Settings).
  //   2. No folder is configured yet (first-launch fallback so the
  //      welcome modal renders against a populated app, not a blank
  //      shell — picking a folder swaps in real data).
  // Either case short-circuits the disk read. The synthetic dataset is
  // deterministic, so callers can toggle it on and off without losing
  // or mixing real-data state. We track the *persisted* demoMode flag
  // in `lastDemoMode` (not the fact we're rendering demo) so the
  // hydrate() change-detection stays correct: when the user later
  // picks a folder OR toggles demo on, the path/flag mismatch triggers
  // a fresh rescan.
  const usingDemoFallback = !config.superwhisperPath
  if (config.demoMode || usingDemoFallback) {
    const t0 = Date.now()
    recordings = buildDemoRecordings(new Date(), config.fillerWords)
    aggregates = computeAll(recordings, new Date())
    indexedAt = new Date().toISOString()
    lastScannedPath = config.superwhisperPath
    lastDemoMode = config.demoMode
    scanErrors = 0
    scanSkipped = 0
    const reason = config.demoMode ? 'demo mode' : 'no folder configured'
    console.log(
      `[cache] generated ${recordings.length} demo recordings in ${Date.now() - t0}ms (${reason})`
    )
    return buildPayload(null)
  }

  // `superwhisperPath` is guaranteed non-null here: the demo fallback
  // branch above catches the null case. Narrow via assertion so the
  // `scan(path, …)` call below doesn't trip the type checker.
  const path = config.superwhisperPath as string
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
  lastDemoMode = false
  scanErrors = result.errors
  scanSkipped = result.skipped
  const t2 = Date.now()
  console.log(
    `[cache] scanned ${recordings.length} recordings in ${t1 - t0}ms, aggregated in ${t2 - t1}ms` +
      (result.skipped ? ` (${result.skipped} folders without meta.json)` : '') +
      (result.errors ? ` (${result.errors} parse errors)` : '')
  )
  return buildPayload(null)
}

/**
 * Return cached data, rescanning lazily if the cache is empty, the
 * configured path has changed since the last scan, or the demo-mode
 * flag has flipped (so the renderer sees fresh data on either side of
 * the toggle).
 */
export function hydrate(): HydratePayload {
  const config = getConfig()
  if (
    indexedAt === null ||
    config.demoMode !== lastDemoMode ||
    config.superwhisperPath !== lastScannedPath
  ) {
    return rescan()
  }
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
