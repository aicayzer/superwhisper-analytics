import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * Credential-blob round-trip coverage. The JSON shape changed in T-164
 * (previously: single string; now: discriminated union). These tests
 * pin the on-disk format + the legacy-string up-conversion path so an
 * existing API-key user doesn't get logged out by the format change.
 */

const fixtures = vi.hoisted(() => ({ userData: '' }))

vi.mock('electron', () => ({
  app: { getPath: () => fixtures.userData },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from(s, 'utf-8'),
    decryptString: (b: Buffer) => b.toString('utf-8')
  }
}))

let tokensModule: typeof import('./tokens')

beforeEach(async () => {
  fixtures.userData = mkdtempSync(join(tmpdir(), 'sw-myme-tokens-'))
  vi.resetModules()
  tokensModule = await import('./tokens')
})

afterEach(() => {
  rmSync(fixtures.userData, { recursive: true, force: true })
})

describe('credential round-trip', () => {
  it('persists and reads back an API-key credential', () => {
    const ok = tokensModule.writeCredential({ kind: 'api-key', key: 'myme_k1_abc' })
    expect(ok).toBe(true)
    const back = tokensModule.readCredential()
    expect(back).toEqual({ kind: 'api-key', key: 'myme_k1_abc' })
  })

  it('persists and reads back an OAuth credential', () => {
    const bundle = {
      access_token: 'at-1',
      refresh_token: 'rt-1',
      access_expires_at: 1735689600000,
      scope: '*:read *:write'
    }
    tokensModule.writeCredential({ kind: 'oauth', clientId: 'cli-1', tokens: bundle })
    const back = tokensModule.readCredential()
    expect(back).toEqual({ kind: 'oauth', clientId: 'cli-1', tokens: bundle })
  })

  it('up-converts a legacy bare-string payload to api-key shape', () => {
    // Pre-T-164 the file held the raw API key as a string.
    const path = join(fixtures.userData, 'myme-credential.enc')
    writeFileSync(path, Buffer.from('myme_k1_legacy', 'utf-8'))
    const back = tokensModule.readCredential()
    expect(back).toEqual({ kind: 'api-key', key: 'myme_k1_legacy' })
  })

  it('returns null on a malformed credential blob', () => {
    const path = join(fixtures.userData, 'myme-credential.enc')
    // JSON, but not the expected shape.
    writeFileSync(path, Buffer.from(JSON.stringify({ kind: 'nope' }), 'utf-8'))
    expect(tokensModule.readCredential()).toBeNull()
  })

  it('clearCredential removes the persisted file', () => {
    tokensModule.writeCredential({ kind: 'api-key', key: 'k' })
    expect(tokensModule.credentialExists()).toBe(true)
    tokensModule.clearCredential()
    expect(tokensModule.credentialExists()).toBe(false)
  })
})
