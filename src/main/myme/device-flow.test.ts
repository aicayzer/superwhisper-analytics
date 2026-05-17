import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'

/**
 * T-164: state-machine coverage for the device-flow happy path + the
 * common terminal failure modes. The SDK transport is mocked at the
 * module level so we exercise the engine-side state transitions without
 * touching the network.
 *
 * Renderer ceremony is out of scope here — covered by the T-166 e2e
 * walkthrough later.
 */

const fixtures = vi.hoisted(() => ({
  userData: '',
  // Mutable fetch handler — each test points this at whatever shape it
  // wants the network to behave as.
  fetch: vi.fn() as unknown as typeof globalThis.fetch,
  // Stub for the SDK client's items.stats — flipped per-test.
  statsResponse: { ok: true as const, value: {} as Record<string, unknown> }
}))

// ---------------------------------------------------------------------------
// Electron + filesystem stubs
// ---------------------------------------------------------------------------

vi.mock('electron', () => ({
  app: {
    getPath: () => fixtures.userData
  },
  safeStorage: {
    isEncryptionAvailable: () => true,
    encryptString: (s: string) => Buffer.from(s, 'utf-8'),
    decryptString: (b: Buffer) => b.toString('utf-8')
  },
  BrowserWindow: {
    getAllWindows: () => []
  }
}))

// ---------------------------------------------------------------------------
// SDK transport stubs
// ---------------------------------------------------------------------------

// The MymeClient constructor accepts either { apiKey } or
// { tokenProvider }. Both paths land on the same minimal mock — what
// matters for these tests is that the verification probe (items.stats)
// returns ok / throws per the fixture flag.
vi.mock('@mymehq/sdk', async () => {
  const actual = await vi.importActual<typeof import('@mymehq/sdk')>('@mymehq/sdk')
  class FakeMymeClient {
    items = {
      stats: vi.fn(async (): Promise<Record<string, unknown>> => {
        if (!fixtures.statsResponse.ok) {
          throw new actual.UnauthorizedError('Invalid credential', undefined)
        }
        return fixtures.statsResponse.value
      })
    }
    constructor(_config: unknown) {
      void _config
    }
  }
  return { ...actual, MymeClient: FakeMymeClient }
})

// SDK auth — only `startDeviceFlow` + the storage class are imported by
// the engine. We hand back a `handle` whose `pollForToken` resolves or
// rejects per the test's wiring; the storage gets the same JSON shape
// the real SDK would persist so `persistTokensFromStorage` round-trips.
vi.mock('@mymehq/sdk/auth', async () => {
  const actual = await vi.importActual<typeof import('@mymehq/sdk/auth')>('@mymehq/sdk/auth')

  // Replaceable across tests so we can swap happy / denied / expired
  // paths without re-mocking the module.
  return {
    ...actual,
    startDeviceFlow: vi.fn()
  }
})

// ---------------------------------------------------------------------------
// Module under test — re-imported per test so state resets cleanly
// ---------------------------------------------------------------------------

let mymeModule: typeof import('./index')
let authModule: typeof import('@mymehq/sdk/auth')
let tokensModule: typeof import('./tokens')

beforeEach(async () => {
  fixtures.userData = mkdtempSync(join(tmpdir(), 'sw-myme-deviceflow-'))
  fixtures.statsResponse = { ok: true, value: {} }
  // Reset modules so the lazy `currentStatus` cache in index.ts doesn't
  // leak between tests.
  vi.resetModules()
  authModule = await import('@mymehq/sdk/auth')
  tokensModule = await import('./tokens')
  mymeModule = await import('./index')

  // Default fetch — DCR returns a client_id; anything else 404s. Tests
  // override this directly when they need richer behaviour.
  fixtures.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = typeof input === 'string' ? input : input.toString()
    if (url.endsWith('/auth/oauth2/register')) {
      return new Response(JSON.stringify({ client_id: 'test-client-id-0001' }), {
        status: 201,
        headers: { 'content-type': 'application/json' }
      })
    }
    return new Response('', { status: 404 })
  }) as unknown as typeof globalThis.fetch
  vi.stubGlobal('fetch', fixtures.fetch)
})

afterEach(() => {
  rmSync(fixtures.userData, { recursive: true, force: true })
  vi.unstubAllGlobals()
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface MockHandleConfig {
  userCode?: string
  verificationUri?: string
  verificationUriComplete?: string
  expiresIn?: number
  // `pollForToken` resolves with the SDK persisting this bundle to its
  // injected storage; provide null to make it throw an OAuthError.
  tokenBundle?: {
    access_token: string
    refresh_token: string
    access_expires_at: number
    scope: string
  } | null
  rejectWith?: import('@mymehq/sdk/auth').OAuthError
}

function installDeviceFlowMock(config: MockHandleConfig): void {
  const mock = authModule.startDeviceFlow as unknown as ReturnType<typeof vi.fn>
  mock.mockImplementation((cfg: import('@mymehq/sdk/auth').StartDeviceFlowConfig) => {
    return Promise.resolve({
      user_code: config.userCode ?? 'TEST-0001',
      verification_uri: config.verificationUri ?? 'https://staging.myme.so/device',
      verification_uri_complete:
        config.verificationUriComplete ?? 'https://staging.myme.so/device?user_code=TEST-0001',
      expires_in: config.expiresIn ?? 600,
      interval: 5,
      pollForToken: async () => {
        if (config.rejectWith) throw config.rejectWith
        if (!config.tokenBundle) {
          throw new authModule.OAuthError('invalid_grant', 'No bundle configured')
        }
        // Mirror the SDK's persist-to-storage step so
        // `persistTokensFromStorage` can find the JSON when we read it
        // out. Key shape is fixed by `device-flow.ts` in the SDK.
        const origin = new URL(cfg.issuer).origin
        const key = `myme.auth.tokens:${origin}:${cfg.clientId}`
        await cfg.storage!.set(key, JSON.stringify(config.tokenBundle))
        // Return a minimal TokenProvider-shaped object; the engine
        // doesn't actually use this — it pulls tokens out of storage.
        return {
          getAccessToken: async () => config.tokenBundle!.access_token,
          onSignOut: () => () => undefined,
          signOut: async () => undefined,
          refresh: async () => config.tokenBundle!.access_token
        }
      }
    })
  })
}

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('device flow — happy path', () => {
  it('transitions through preparing → connecting(device) → connected', async () => {
    installDeviceFlowMock({
      tokenBundle: {
        access_token: 'access-1',
        refresh_token: 'refresh-1',
        access_expires_at: Date.now() + 3600_000,
        scope: '*:read *:write'
      }
    })

    const final = await mymeModule.connect()
    expect(final.kind).toBe('connected')
    if (final.kind !== 'connected') return
    expect(final.lastError).toBeNull()

    // The credential blob on disk should now carry the OAuth bundle.
    const stored = tokensModule.readCredential()
    expect(stored).not.toBeNull()
    if (stored === null) return
    expect(stored.kind).toBe('oauth')
    if (stored.kind !== 'oauth') return
    expect(stored.clientId).toBe('test-client-id-0001')
    expect(stored.tokens.access_token).toBe('access-1')
    expect(stored.tokens.refresh_token).toBe('refresh-1')
  })

  it('exposes the user code + verification URI mid-flow', async () => {
    // Use a controllable poll so we can inspect the connecting status
    // before it resolves. We swap startDeviceFlow inline to hold the
    // promise open until we release it.
    let release: () => void
    const gate = new Promise<void>((resolve) => {
      release = resolve
    })
    const mock = authModule.startDeviceFlow as unknown as ReturnType<typeof vi.fn>
    mock.mockImplementation((cfg: import('@mymehq/sdk/auth').StartDeviceFlowConfig) =>
      Promise.resolve({
        user_code: 'WXYZ-1234',
        verification_uri: 'https://staging.myme.so/device',
        verification_uri_complete: 'https://staging.myme.so/device?user_code=WXYZ-1234',
        expires_in: 600,
        interval: 5,
        pollForToken: async () => {
          await gate
          const origin = new URL(cfg.issuer).origin
          await cfg.storage!.set(
            `myme.auth.tokens:${origin}:${cfg.clientId}`,
            JSON.stringify({
              access_token: 'a',
              refresh_token: 'r',
              access_expires_at: Date.now() + 3600_000,
              scope: '*:read *:write'
            })
          )
          return {
            getAccessToken: async () => 'a',
            onSignOut: () => () => undefined,
            signOut: async () => undefined,
            refresh: async () => 'a'
          }
        }
      })
    )

    const connectP = mymeModule.connect()
    // Yield a few microtasks so the DCR + initiate-flow setState run.
    await new Promise((r) => setTimeout(r, 10))
    const mid = mymeModule.getStatus()
    expect(mid.kind).toBe('connecting')
    if (mid.kind !== 'connecting') return
    expect(mid.mode).toBe('device')
    if (mid.mode !== 'device') return
    expect(mid.userCode).toBe('WXYZ-1234')
    expect(mid.verificationUri).toBe('https://staging.myme.so/device')
    expect(mid.verificationUriComplete).toBe('https://staging.myme.so/device?user_code=WXYZ-1234')

    release!()
    const final = await connectP
    expect(final.kind).toBe('connected')
  })
})

// ---------------------------------------------------------------------------
// Failure paths
// ---------------------------------------------------------------------------

describe('device flow — terminal failures', () => {
  it('user denial returns to disconnected with a readable error', async () => {
    installDeviceFlowMock({
      rejectWith: new authModule.OAuthError('access_denied', 'User denied'),
      tokenBundle: null
    })

    const final = await mymeModule.connect()
    expect(final.kind).toBe('disconnected')
    if (final.kind !== 'disconnected') return
    expect(final.lastError).toMatch(/cancelled/i)
    // No credential should have been persisted.
    expect(tokensModule.readCredential()).toBeNull()
  })

  it('code expired returns to disconnected with an expired-code message', async () => {
    installDeviceFlowMock({
      rejectWith: new authModule.OAuthError('expired_token', 'Device code expired'),
      tokenBundle: null
    })

    const final = await mymeModule.connect()
    expect(final.kind).toBe('disconnected')
    if (final.kind !== 'disconnected') return
    expect(final.lastError).toMatch(/expired/i)
  })

  it('DCR network failure surfaces as a connect error', async () => {
    // Make fetch reject for the registration URL.
    fixtures.fetch = vi.fn(async (input: RequestInfo | URL) => {
      const url = typeof input === 'string' ? input : input.toString()
      if (url.endsWith('/auth/oauth2/register')) {
        throw new Error('ECONNREFUSED')
      }
      return new Response('', { status: 404 })
    }) as unknown as typeof globalThis.fetch
    vi.stubGlobal('fetch', fixtures.fetch)
    installDeviceFlowMock({ tokenBundle: null })

    const final = await mymeModule.connect()
    expect(final.kind).toBe('disconnected')
    if (final.kind !== 'disconnected') return
    expect(final.lastError).toMatch(/ECONNREFUSED/)
  })

  it('cancelConnect mid-flow aborts the poll and lands on disconnected', async () => {
    // Hold the poll open indefinitely so we can hit the cancel path.
    const mock = authModule.startDeviceFlow as unknown as ReturnType<typeof vi.fn>
    mock.mockImplementation(() =>
      Promise.resolve({
        user_code: 'A',
        verification_uri: 'https://x',
        verification_uri_complete: 'https://x?a',
        expires_in: 600,
        interval: 5,
        pollForToken: ({ signal }: { signal?: AbortSignal } = {}) =>
          new Promise<never>((_, reject) => {
            signal?.addEventListener('abort', () => {
              reject(new authModule.OAuthError('invalid_request', 'Aborted'))
            })
          })
      })
    )

    const connectP = mymeModule.connect()
    await new Promise((r) => setTimeout(r, 10))
    expect(mymeModule.getStatus().kind).toBe('connecting')
    const after = mymeModule.cancelConnect()
    expect(after.kind).toBe('disconnected')
    // The original connect promise resolves once the abort surfaces;
    // the final status should still be disconnected.
    const final = await connectP
    expect(final.kind).toBe('disconnected')
  })
})

// ---------------------------------------------------------------------------
// API-key fallback path
// ---------------------------------------------------------------------------

describe('device flow — API key fallback', () => {
  it('useApiKey transitions into connecting(mode: api-key)', () => {
    const next = mymeModule.useApiKey()
    expect(next.kind).toBe('connecting')
    if (next.kind !== 'connecting') return
    expect(next.mode).toBe('api-key')
  })

  it('submitApiKey on a valid key still reaches connected', async () => {
    fixtures.statsResponse = { ok: true, value: {} }
    const final = await mymeModule.submitApiKey('myme_k1_test')
    expect(final.kind).toBe('connected')
    const stored = tokensModule.readCredential()
    expect(stored?.kind).toBe('api-key')
  })
})
