import type { Recording } from '@shared/types'

/**
 * Sessions are an analytics-app concept — gap-grouped recordings,
 * computed locally. They don't exist in Superwhisper's on-disk data.
 *
 * Algorithm: sort recordings by start datetime ascending; walk in order,
 * starting a new session whenever the gap between the previous recording's
 * *end* and the current recording's *start* exceeds the configured
 * threshold. Each session carries the constituent recording ids in the
 * original chronological order.
 *
 * The natural key for the resulting Myme item is `(first_recording_id,
 * gap_threshold_minutes)` — a threshold change yields fresh source_ids,
 * which means fresh items in Myme. Old session items get diff'd out by
 * the engine and soft-deleted. This is the "trash-and-re-mint"
 * resolution to the open question in [[Myme integration — May 2026]].
 */

export const DEFAULT_GAP_THRESHOLD_MINUTES = 30

export interface SessionGroup {
  /** Stable identifier for the session — `${recordingIds[0]}-${threshold}`. */
  sourceId: string
  /** Earliest recording in chronological order. */
  startedAt: string // ISO
  /** End of the last recording (datetime + duration). */
  endedAt: string // ISO
  /** Number of recordings included. */
  recordingCount: number
  /** Sum of recording durations (seconds). */
  totalDurationSeconds: number
  /** Most-used mode among constituent recordings. Tie-break: first seen. */
  dominantMode: string
  /** Threshold that defined this session's boundaries. Persisted so the
   *  natural key resolves stably across runs at the same setting and
   *  surfaces fresh source_ids when the user changes it. */
  gapThresholdMinutes: number
  /** Recording source_ids in chronological order — used for the
   *  `parent-of` edges from session → recording. */
  recordingIds: string[]
}

/**
 * Group `recordings` into sessions using the supplied threshold. Pure —
 * given the same input + threshold, returns the same groups. Empty
 * input → empty array; never throws.
 */
export function groupIntoSessions(
  recordings: Recording[],
  thresholdMinutes: number = DEFAULT_GAP_THRESHOLD_MINUTES
): SessionGroup[] {
  if (recordings.length === 0) return []
  // Stable sort by start datetime. Recordings with the same datetime
  // (very rare in practice) keep insertion order.
  const sorted = [...recordings].sort((a, b) => a.datetime.localeCompare(b.datetime))

  const gapMs = Math.max(0, thresholdMinutes) * 60_000
  const groups: Array<{
    items: Recording[]
    startMs: number
    endMs: number
  }> = []
  for (const r of sorted) {
    const startMs = new Date(r.datetime).getTime()
    if (!Number.isFinite(startMs)) continue
    const endMs = startMs + Math.max(0, r.duration)
    const current = groups[groups.length - 1]
    if (current && startMs - current.endMs <= gapMs) {
      current.items.push(r)
      // The session extends to whichever endpoint is later — defensive
      // against pathological out-of-order duration values.
      if (endMs > current.endMs) current.endMs = endMs
    } else {
      groups.push({ items: [r], startMs, endMs })
    }
  }

  return groups.map((g) => {
    const first = g.items[0]
    // `first` is always defined — every group has at least one entry by
    // construction. Narrow defensively rather than via assertion so
    // future refactors can't introduce a silent crash.
    if (!first) {
      throw new Error('Internal: empty session group')
    }
    const totalDurationSeconds = g.items.reduce((sum, r) => sum + Math.max(0, r.duration), 0) / 1000
    return {
      sourceId: `${first.id}-${thresholdMinutes}`,
      startedAt: new Date(g.startMs).toISOString(),
      endedAt: new Date(g.endMs).toISOString(),
      recordingCount: g.items.length,
      totalDurationSeconds,
      dominantMode: pickDominantMode(g.items),
      gapThresholdMinutes: thresholdMinutes,
      recordingIds: g.items.map((r) => r.id)
    }
  })
}

/**
 * Pick the most-used mode in a session. Tie-break: the first mode
 * encountered chronologically wins, matching the "label by what the
 * user started with" intuition.
 */
function pickDominantMode(items: Recording[]): string {
  const counts = new Map<string, number>()
  const firstSeen = new Map<string, number>()
  for (let i = 0; i < items.length; i += 1) {
    const item = items[i]
    if (!item) continue
    const mode = item.modeName || ''
    counts.set(mode, (counts.get(mode) ?? 0) + 1)
    if (!firstSeen.has(mode)) firstSeen.set(mode, i)
  }
  let bestMode = ''
  let bestCount = -1
  let bestFirstSeen = Number.POSITIVE_INFINITY
  for (const [mode, count] of counts) {
    const seen = firstSeen.get(mode) ?? Number.POSITIVE_INFINITY
    if (count > bestCount || (count === bestCount && seen < bestFirstSeen)) {
      bestMode = mode
      bestCount = count
      bestFirstSeen = seen
    }
  }
  return bestMode
}
