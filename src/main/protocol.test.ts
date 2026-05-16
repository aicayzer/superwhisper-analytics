import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { pathToFileURL } from 'url'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * The `sw://` handler is registered by calling `protocol.handle(scheme,
 * handler)`. To exercise it we mock `electron` so `protocol.handle`
 * captures the handler into a shared state object, then drive it
 * directly with `new Request(...)` per test case. `./config.getConfig`
 * is also mocked so the recordings-root can flip between cases.
 *
 * `vi.hoisted` is the same shape used by `config.test.ts` — it gives
 * the mock factory a reference the test can mutate at runtime.
 */
const state = vi.hoisted(() => ({
  handler: null as ((req: Request) => Promise<Response>) | null,
  netFetch: vi.fn() as ReturnType<typeof vi.fn>
}))

vi.mock('electron', () => ({
  net: {
    fetch: (...args: unknown[]) => state.netFetch(...args)
  },
  protocol: {
    handle: (_scheme: string, handler: (req: Request) => Promise<Response>) => {
      state.handler = handler
    },
    registerSchemesAsPrivileged: () => {}
  }
}))

const configMock = vi.hoisted(() => ({
  superwhisperPath: null as string | null
}))

vi.mock('./config', () => ({
  getConfig: () => ({
    superwhisperPath: configMock.superwhisperPath,
    fillerWords: [],
    watchFolder: false,
    transcriptsOnly: false,
    demoMode: false,
    autoHideSidebar: true,
    devTools: false
  })
}))

// Import after the mocks so protocol.ts picks up the stubbed deps.
import { registerSwProtocolHandler } from './protocol'

let root: string

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'sw-protocol-'))
  configMock.superwhisperPath = root
  state.handler = null
  state.netFetch.mockReset()
  // Return a sentinel Response so the happy path has something
  // observable to assert on.
  state.netFetch.mockResolvedValue(new Response('ok', { status: 200 }))
  registerSwProtocolHandler()
})

afterEach(() => {
  rmSync(root, { recursive: true, force: true })
})

async function call(url: string): Promise<Response> {
  if (!state.handler) throw new Error('protocol handler was never registered')
  return state.handler(new Request(url))
}

describe('sw:// protocol handler', () => {
  it('rejects path traversal with 403', async () => {
    // The URL parser normalises literal `../` segments at parse time
    // (so `sw://recording/<id>/../../etc/passwd` becomes
    // `sw://recording/etc/passwd` before our handler even sees it).
    // The real attack surface is URL-encoded traversal that survives
    // parsing and lands in the file portion via decodeURIComponent —
    // that's what the explicit guard at protocol.ts:102 catches.
    const id = '1000000001'
    mkdirSync(join(root, id))
    writeFileSync(join(root, id, 'output.wav'), 'audio-bytes', 'utf-8')
    const encoded = encodeURIComponent('../../etc/passwd')
    const res = await call(`sw://recording/${id}/${encoded}`)
    expect(res.status).toBe(403)
    expect(await res.text()).toMatch(/escapes/i)
    // Crucially, net.fetch must not have been called — the guard
    // short-circuits before we get there.
    expect(state.netFetch).not.toHaveBeenCalled()
  })

  it('rejects a wrong host with 403', async () => {
    const res = await call('sw://other-host/1000000001/output.wav')
    expect(res.status).toBe(403)
    expect(await res.text()).toMatch(/host/i)
    expect(state.netFetch).not.toHaveBeenCalled()
  })

  it('returns 404 when no recordings folder is configured', async () => {
    configMock.superwhisperPath = null
    const res = await call('sw://recording/1000000001/output.wav')
    expect(res.status).toBe(404)
    expect(await res.text()).toMatch(/No recordings folder/i)
  })

  it('returns 404 when the URL is missing the file segment', async () => {
    const res = await call('sw://recording/1000000001/')
    expect(res.status).toBe(404)
    expect(await res.text()).toMatch(/both id and file/i)
  })

  it('returns 404 when the resolved file does not exist', async () => {
    // id directory absent — guard passes (no traversal), existsSync trips.
    const res = await call('sw://recording/9999999999/output.wav')
    expect(res.status).toBe(404)
    expect(await res.text()).toMatch(/not found/i)
  })

  it('delegates to net.fetch for a valid path under the root', async () => {
    const id = '1000000001'
    mkdirSync(join(root, id))
    const wav = join(root, id, 'output.wav')
    writeFileSync(wav, 'audio-bytes', 'utf-8')

    const res = await call(`sw://recording/${id}/output.wav`)
    expect(res.status).toBe(200)
    expect(state.netFetch).toHaveBeenCalledTimes(1)
    expect(state.netFetch).toHaveBeenCalledWith(pathToFileURL(wav).toString())
  })
})
