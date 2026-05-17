import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ userData: '' }))
vi.mock('electron', () => ({ app: { getPath: () => state.userData } }))

import { clearState, loadState, saveState } from './state'

beforeEach(() => {
  state.userData = mkdtempSync(join(tmpdir(), 'sw-myme-state-'))
})

afterEach(() => {
  rmSync(state.userData, { recursive: true, force: true })
})

describe('loadState', () => {
  it('returns an empty state when the file is missing', () => {
    const s = loadState()
    expect(s.schemaVersion).toBe(1)
    expect(s.recordings).toEqual({})
    expect(s.sessions).toEqual({})
    expect(s.lastFullSyncAt).toBeNull()
  })

  it('falls back to empty state on malformed JSON', () => {
    writeFileSync(join(state.userData, 'myme-sync.json'), '{not json', 'utf-8')
    const s = loadState()
    expect(s.recordings).toEqual({})
  })

  it('drops bogus recording entries (defensive parse)', () => {
    writeFileSync(
      join(state.userData, 'myme-sync.json'),
      JSON.stringify({
        schemaVersion: 1,
        recordings: { ok: { hash: 'abc', itemId: 'item-1', lastPushedAt: 'x' }, bad: 'nope' },
        sessions: {},
        lastFullSyncAt: null
      }),
      'utf-8'
    )
    const s = loadState()
    // Validator is whole-record: if any entry is malformed, the whole
    // map is dropped. Acceptable for engine state — a corrupted file
    // forces a fresh full sync rather than silently using mixed data.
    expect(s.recordings).toEqual({})
  })

  it('round-trips a saved state', () => {
    const original = {
      schemaVersion: 1,
      recordings: {
        '1755164573': {
          hash: 'abc',
          itemId: '019e0000-0000-7000-8000-000000000001',
          lastPushedAt: '2026-05-11T10:00:00.000Z'
        }
      },
      sessions: {},
      lastFullSyncAt: '2026-05-11T10:00:01.000Z'
    }
    expect(saveState(original)).toBe(true)
    const loaded = loadState()
    expect(loaded).toEqual(original)
  })
})

describe('saveState', () => {
  it('writes via a temp file + rename (no partial files on success)', () => {
    saveState({
      schemaVersion: 1,
      recordings: { a: { hash: 'h', itemId: 'item-a', lastPushedAt: 'x' } },
      sessions: {},
      lastFullSyncAt: null
    })
    expect(existsSync(join(state.userData, 'myme-sync.json'))).toBe(true)
    // Atomic write idiom: the .tmp shouldn't survive a successful write.
    expect(existsSync(join(state.userData, 'myme-sync.json.tmp'))).toBe(false)
    // Ensure the persisted JSON is well-formed.
    const raw = readFileSync(join(state.userData, 'myme-sync.json'), 'utf-8')
    expect(() => JSON.parse(raw)).not.toThrow()
  })
})

describe('clearState', () => {
  it('deletes the persisted file', () => {
    saveState({ schemaVersion: 1, recordings: {}, sessions: {}, lastFullSyncAt: null })
    expect(existsSync(join(state.userData, 'myme-sync.json'))).toBe(true)
    clearState()
    expect(existsSync(join(state.userData, 'myme-sync.json'))).toBe(false)
  })

  it('is a noop when no file exists', () => {
    expect(() => clearState()).not.toThrow()
  })
})
