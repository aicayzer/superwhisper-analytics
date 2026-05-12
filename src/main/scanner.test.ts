import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { scan } from './scanner'

/**
 * Spin up a fresh recordings root under tmpdir per test so the scanner
 * gets a clean, controlled fixture. No committed sample data; each
 * folder layout is built inline and torn down in afterEach.
 */
let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'sw-scanner-'))
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

function makeRecording(
  id: string,
  meta: Record<string, unknown> = {}
): { result: string; duration: number } {
  const dir = join(root, id)
  mkdirSync(dir, { recursive: true })
  const full = {
    appVersion: '1.0',
    datetime: '2026-05-11T10:00:00',
    duration: 60_000,
    processingTime: 1000,
    modeName: 'Default',
    modelName: 'whisper',
    recordingDevice: 'mic',
    languageSelected: 'en',
    result: 'Hello world. This is a test sentence! And another one?',
    rawResult: 'hello world',
    segments: [],
    ...meta
  }
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(full), 'utf-8')
  return { result: String(full.result), duration: Number(full.duration) }
}

describe('scan', () => {
  it('parses a valid recording and derives metrics', () => {
    makeRecording('1000000001')
    const { recordings, errors, skipped } = scan(root, [])
    expect(recordings).toHaveLength(1)
    expect(errors).toBe(0)
    expect(skipped).toBe(0)
    const r = recordings[0]!
    expect(r.id).toBe('1000000001')
    expect(r.modeName).toBe('Default')
    expect(r.wordCount).toBe(10)
    // 10 words / 60s × 60 = 10 wpm
    expect(r.wordsPerMinute).toBe(10)
    expect(r.sentenceCount).toBe(3)
    expect(r.excerpt.length).toBeGreaterThan(0)
  })

  it('counts malformed JSON folders as errors', () => {
    const bad = join(root, '1000000002')
    mkdirSync(bad)
    writeFileSync(join(bad, 'meta.json'), '{ this is not json', 'utf-8')
    makeRecording('1000000001')
    const { recordings, errors, skipped } = scan(root, [])
    expect(recordings).toHaveLength(1)
    expect(errors).toBe(1)
    expect(skipped).toBe(0)
  })

  it('counts folders without meta.json as skipped', () => {
    // Sibling folders without meta.json — common in real installs
    // (a `cache/` folder, etc.).
    mkdirSync(join(root, 'cache'))
    mkdirSync(join(root, 'tmp'))
    makeRecording('1000000001')
    const { recordings, errors, skipped } = scan(root, [])
    expect(recordings).toHaveLength(1)
    expect(errors).toBe(0)
    expect(skipped).toBe(2)
  })

  it('ignores non-directory entries at the root', () => {
    writeFileSync(join(root, 'stray.txt'), 'noise', 'utf-8')
    makeRecording('1000000001')
    const { recordings, skipped } = scan(root, [])
    expect(recordings).toHaveLength(1)
    expect(skipped).toBe(0)
  })

  it('treats zero-duration recordings as 0 wpm (not Infinity)', () => {
    makeRecording('1000000001', { duration: 0, result: 'a word or two' })
    const { recordings } = scan(root, [])
    expect(recordings[0]?.wordsPerMinute).toBe(0)
  })

  it('returns empty result without throwing when root does not exist', () => {
    const out = scan(join(root, 'does-not-exist'), [])
    expect(out.recordings).toEqual([])
    expect(out.errors).toBe(0)
    expect(out.skipped).toBe(0)
  })

  it('sorts recordings newest-first by datetime', () => {
    makeRecording('1000000001', { datetime: '2026-05-01T10:00:00' })
    makeRecording('1000000002', { datetime: '2026-05-10T10:00:00' })
    makeRecording('1000000003', { datetime: '2026-05-05T10:00:00' })
    const { recordings } = scan(root, [])
    expect(recordings.map((r) => r.datetime)).toEqual([
      '2026-05-10T10:00:00',
      '2026-05-05T10:00:00',
      '2026-05-01T10:00:00'
    ])
  })

  it('threads the configured filler-phrase list into fillerBreakdown', () => {
    makeRecording('1000000001', { result: 'um well like um yes' })
    const { recordings } = scan(root, ['um', 'like'])
    expect(recordings[0]?.fillerCount).toBe(3)
    const phrases = recordings[0]?.fillerBreakdown.map((b) => b.phrase)
    expect(phrases).toContain('um')
    expect(phrases).toContain('like')
    expect(phrases).not.toContain('well')
  })
})
