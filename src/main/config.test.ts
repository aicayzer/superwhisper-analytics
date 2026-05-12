import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs'
import { homedir, tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_FILLER_PHRASES } from '@shared/text-metrics'

/**
 * config.ts reads its target path from `electron.app.getPath('userData')`.
 * Tests need a writable tmp dir per case, so the mock returns whatever
 * the test sets on `state.userData`. The reference is captured via
 * `vi.hoisted` so the mock factory (hoisted above imports) can see it.
 */
const state = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => state.userData }
}))

// Imports after the mock so config.ts picks up the stubbed electron.
import {
  getConfig,
  isPathInsideHome,
  isPathValid,
  resetConfig,
  resolveRecordingsPath,
  setConfig
} from './config'

beforeEach(() => {
  state.userData = mkdtempSync(join(tmpdir(), 'sw-config-'))
})

afterEach(() => {
  rmSync(state.userData, { recursive: true, force: true })
})

function configFile(): string {
  return join(state.userData, 'config.json')
}

describe('getConfig', () => {
  it('returns defaults when no config file exists', () => {
    const c = getConfig()
    expect(c.superwhisperPath).toBeNull()
    expect(c.demoMode).toBe(false)
    expect(c.autoHideSidebar).toBe(true) // default ON
    expect(c.watchFolder).toBe(false)
    expect(c.transcriptsOnly).toBe(false)
    expect(c.fillerWords).toEqual([...DEFAULT_FILLER_PHRASES])
  })

  it('injects default fillerWords when a config file omits the field', () => {
    writeFileSync(configFile(), JSON.stringify({ superwhisperPath: '/some/path' }), 'utf-8')
    const c = getConfig()
    expect(c.fillerWords).toEqual([...DEFAULT_FILLER_PHRASES])
  })

  it('preserves an empty fillerWords array (user opted out)', () => {
    writeFileSync(configFile(), JSON.stringify({ fillerWords: [] }), 'utf-8')
    expect(getConfig().fillerWords).toEqual([])
  })

  it('appends missing canonical phrases to a partial list (additive migration)', () => {
    writeFileSync(configFile(), JSON.stringify({ fillerWords: ['custom-phrase'] }), 'utf-8')
    const c = getConfig()
    expect(c.fillerWords[0]).toBe('custom-phrase')
    // Every default phrase appears somewhere in the merged list.
    for (const p of DEFAULT_FILLER_PHRASES) {
      expect(c.fillerWords).toContain(p.toLowerCase())
    }
  })

  it('falls back to defaults when the file is malformed JSON', () => {
    writeFileSync(configFile(), '{ not json', 'utf-8')
    const c = getConfig()
    expect(c.superwhisperPath).toBeNull()
    expect(c.fillerWords).toEqual([...DEFAULT_FILLER_PHRASES])
  })
})

describe('setConfig', () => {
  it('round-trips through disk', () => {
    setConfig({ superwhisperPath: '/some/path', demoMode: true })
    const persisted = JSON.parse(readFileSync(configFile(), 'utf-8'))
    expect(persisted.superwhisperPath).toBe('/some/path')
    expect(persisted.demoMode).toBe(true)
    // And the next read returns the merged value.
    const reread = getConfig()
    expect(reread.superwhisperPath).toBe('/some/path')
    expect(reread.demoMode).toBe(true)
  })
})

describe('resetConfig', () => {
  it('writes defaults back, clearing any persisted state', () => {
    setConfig({ superwhisperPath: '/some/path', demoMode: true, autoHideSidebar: false })
    const fresh = resetConfig()
    expect(fresh.superwhisperPath).toBeNull()
    expect(fresh.demoMode).toBe(false)
    expect(fresh.autoHideSidebar).toBe(true)
    // And the file on disk matches.
    expect(getConfig().superwhisperPath).toBeNull()
  })
})

describe('isPathValid', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'sw-validate-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns true for a directory with at least one child containing meta.json', () => {
    mkdirSync(join(root, '1000000001'))
    writeFileSync(join(root, '1000000001', 'meta.json'), '{}', 'utf-8')
    expect(isPathValid(root)).toBe(true)
  })

  it('returns false for an empty directory', () => {
    expect(isPathValid(root)).toBe(false)
  })

  it('returns false for a non-existent path', () => {
    expect(isPathValid(join(root, 'nope'))).toBe(false)
  })

  it('returns false for null / undefined / empty string', () => {
    expect(isPathValid(null)).toBe(false)
    expect(isPathValid(undefined)).toBe(false)
    expect(isPathValid('')).toBe(false)
  })
})

describe('resolveRecordingsPath', () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'sw-resolve-'))
  })
  afterEach(() => {
    rmSync(root, { recursive: true, force: true })
  })

  it('returns the picked path unchanged when it is already a valid recordings dir', () => {
    mkdirSync(join(root, '1000000001'))
    writeFileSync(join(root, '1000000001', 'meta.json'), '{}', 'utf-8')
    expect(resolveRecordingsPath(root)).toBe(root)
  })

  it('promotes to the `recordings/` child when the picked path is a SuperWhisper parent', () => {
    // Parent folder has no recordings of its own, but its `recordings/`
    // subdir does — this is the common case for users who picked the
    // SuperWhisper container by mistake.
    const sub = join(root, 'recordings')
    mkdirSync(join(sub, '1000000001'), { recursive: true })
    writeFileSync(join(sub, '1000000001', 'meta.json'), '{}', 'utf-8')
    expect(resolveRecordingsPath(root)).toBe(sub)
  })

  it('returns the original path when neither it nor `recordings/` is valid', () => {
    expect(resolveRecordingsPath(root)).toBe(root)
  })
})

describe('isPathInsideHome', () => {
  it('returns true for paths under the user home directory', () => {
    expect(isPathInsideHome(join(homedir(), 'anywhere'))).toBe(true)
  })

  it('returns false for paths outside home', () => {
    expect(isPathInsideHome('/var/tmp/whatever')).toBe(false)
  })

  it('treats null / undefined as inside (no path = no concern)', () => {
    expect(isPathInsideHome(null)).toBe(true)
    expect(isPathInsideHome(undefined)).toBe(true)
  })
})
