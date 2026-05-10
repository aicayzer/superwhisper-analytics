import { readdirSync, readFileSync, type Dirent } from 'fs'
import { join } from 'path'
import { buildFillers } from '@shared/text-metrics'
import type { Recording, Segment } from '@shared/types'

/**
 * Walk the SuperWhisper recordings folder and return one `Recording`
 * per child directory that contains a parseable `meta.json`.
 *
 * Synchronous by design — sampled performance on 11k recordings is
 * ~200ms on Apple Silicon (faster than the React tree mounts), so the
 * extra complexity of a worker thread or chunked async API isn't
 * worth it. Aggregates run in the same tick.
 *
 * Folders without `meta.json`, or with invalid JSON, are skipped with a
 * single warning log per failure type (kept low so 100 broken folders
 * don't spam stdout).
 */

interface RawMeta {
  appVersion?: unknown
  datetime?: unknown
  duration?: unknown
  processingTime?: unknown
  modeName?: unknown
  modelName?: unknown
  recordingDevice?: unknown
  languageSelected?: unknown
  result?: unknown
  rawResult?: unknown
  segments?: unknown
}

function asString(v: unknown, fallback = ''): string {
  return typeof v === 'string' ? v : fallback
}

function asNumber(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function parseSegments(v: unknown): Segment[] {
  if (!Array.isArray(v)) return []
  const out: Segment[] = []
  for (const raw of v) {
    if (!raw || typeof raw !== 'object') continue
    const o = raw as Record<string, unknown>
    const start = asNumber(o.start)
    const end = asNumber(o.end)
    const text = asString(o.text)
    if (text) out.push({ start, end, text })
  }
  return out
}

/**
 * Word count that mirrors how a user thinks of word counts — includes
 * stop-words. `tokenise()` is for analytics (frequency, vocabulary
 * growth); raw word count uses whitespace split.
 */
function rawWordCount(text: string): number {
  if (!text) return 0
  return text.trim().split(/\s+/).filter(Boolean).length
}

function sentenceCount(text: string): number {
  if (!text) return 0
  return text.split(/[.!?]+/).filter((s) => s.trim()).length
}

/** Truncate result to a snippet for the TranscriptsList excerpt column. */
function buildExcerpt(text: string, max = 240): string {
  if (!text) return ''
  if (text.length <= max) return text
  return text.slice(0, Math.max(0, max - 1)).trimEnd() + '…'
}

function metaToRecording(id: string, meta: RawMeta, fillerPhrases: readonly string[]): Recording {
  const result = asString(meta.result)
  const durationMs = asNumber(meta.duration)
  const words = rawWordCount(result)
  const fillers = buildFillers(result, fillerPhrases)
  return {
    id,
    datetime: asString(meta.datetime),
    modeName: asString(meta.modeName, 'Unknown'),
    modelName: asString(meta.modelName, 'Unknown'),
    appVersion: asString(meta.appVersion),
    recordingDevice: asString(meta.recordingDevice),
    languageSelected: asString(meta.languageSelected),
    duration: durationMs,
    processingTime: asNumber(meta.processingTime),
    result,
    rawResult: asString(meta.rawResult),
    segments: parseSegments(meta.segments),
    wordCount: words,
    // Guard against zero-duration recordings — a small handful exist in
    // real data (fast cancels, hardware glitches). Reporting wpm = 0 is
    // more honest than infinity.
    wordsPerMinute: durationMs > 0 ? Math.round((words / (durationMs / 1000)) * 60) : 0,
    sentenceCount: sentenceCount(result),
    fillerCount: fillers.count,
    fillerBreakdown: fillers.breakdown,
    excerpt: buildExcerpt(result)
  }
}

export interface ScanResult {
  recordings: Recording[]
  /** Folders we tried to parse but couldn't. */
  errors: number
  /** Folders we skipped because they didn't contain a meta.json. */
  skipped: number
}

export function scan(rootPath: string, fillerPhrases: readonly string[]): ScanResult {
  let entries: Dirent[]
  try {
    entries = readdirSync(rootPath, { withFileTypes: true }) as Dirent[]
  } catch (err) {
    console.warn('[scanner] failed to read root', rootPath, err)
    return { recordings: [], errors: 0, skipped: 0 }
  }

  const recordings: Recording[] = []
  let errors = 0
  let skipped = 0
  let firstParseErrorLogged = false

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const id = String(entry.name)
    const metaPath = join(rootPath, id, 'meta.json')
    let raw: string
    try {
      raw = readFileSync(metaPath, 'utf-8')
    } catch {
      // No meta.json — silently skip (folder may be unrelated).
      skipped++
      continue
    }
    try {
      const parsed = JSON.parse(raw) as RawMeta
      recordings.push(metaToRecording(id, parsed, fillerPhrases))
    } catch (err) {
      errors++
      if (!firstParseErrorLogged) {
        console.warn(
          '[scanner] failed to parse',
          metaPath,
          '— suppressing further parse errors',
          err
        )
        firstParseErrorLogged = true
      }
    }
  }

  // Sort newest first — matches the legacy mock ordering and what every
  // list-style screen wants by default.
  recordings.sort((a, b) => b.datetime.localeCompare(a.datetime))

  return { recordings, errors, skipped }
}
