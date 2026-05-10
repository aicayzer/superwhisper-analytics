import { net, protocol } from 'electron'
import { existsSync } from 'fs'
import { resolve, sep } from 'path'
import { pathToFileURL } from 'url'
import { getConfig } from './config'

/**
 * Custom `sw://` protocol that streams recording audio from disk to
 * the renderer's `<audio>` element.
 *
 * URL shape: `sw://recording/<id>/<file>`
 *   • host  = literal "recording" (constant, see below)
 *   • path  = "<id>/<file>" — id is the timestamp folder name, file is the
 *             leaf inside it (today only output.wav)
 *
 * Why a constant host? Recording ids are 10-digit Unix timestamps (e.g.
 * 1755164573). With `standard: true`, Chromium's URL parser interprets
 * numeric hosts under 2³² as packed-integer IPv4 addresses — so
 * `new URL('sw://1755164573/output.wav').host` is the dotted-quad form,
 * not the original digits. Putting "recording" in the host slot dodges
 * the IPv4 reinterpretation entirely; the id lives in the path.
 *
 * Why a custom scheme rather than `file://`? Two reasons:
 *
 *   1. The renderer is sandboxed; allowing `file://` would expose the
 *      entire filesystem. A scoped scheme is auditable.
 *   2. We can rewrite the path to `<configPath>/<id>/...` so the
 *      renderer never needs to know the user's actual SuperWhisper
 *      path — it just speaks ids.
 *
 * Privileges (set before app.whenReady):
 *   • standard       — host/path semantics so `new URL()` parses cleanly
 *   • secure         — treated as a secure context (no mixed-content)
 *   • supportFetchAPI — fetch() works from the renderer for peak decoding
 *   • stream         — Range requests propagate, so `<audio>` can seek
 *
 * Path-traversal guard: the resolved absolute path must start with
 * `<configRoot>/`. Anything escaping the root returns 403.
 */

export const SW_SCHEME = 'sw'
export const SW_HOST = 'recording'

export function registerSwSchemeAsPrivileged(): void {
  protocol.registerSchemesAsPrivileged([
    {
      scheme: SW_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        stream: true
      }
    }
  ])
}

function notFound(message: string): Response {
  return new Response(message, {
    status: 404,
    headers: { 'Content-Type': 'text/plain' }
  })
}

function forbidden(message: string): Response {
  return new Response(message, {
    status: 403,
    headers: { 'Content-Type': 'text/plain' }
  })
}

export function registerSwProtocolHandler(): void {
  protocol.handle(SW_SCHEME, async (request) => {
    const root = getConfig().superwhisperPath
    if (!root) return notFound('No recordings folder configured.')

    let parsed: URL
    try {
      parsed = new URL(request.url)
    } catch {
      return forbidden('Malformed sw:// URL.')
    }

    if (parsed.host !== SW_HOST) {
      return forbidden(`sw:// host must be "${SW_HOST}".`)
    }

    // pathname is "/<id>/<file>" — split on the first slash after the
    // leading one, leaving id and the (possibly nested) file portion.
    const trimmed = parsed.pathname.replace(/^\/+/, '')
    const slash = trimmed.indexOf('/')
    if (slash <= 0) return notFound('sw:// URL must include both id and file.')
    const id = decodeURIComponent(trimmed.slice(0, slash))
    const file = decodeURIComponent(trimmed.slice(slash + 1))
    if (!id || !file) return notFound('sw:// URL must include both id and file.')

    const rootResolved = resolve(root)
    const target = resolve(rootResolved, id, file)

    // Path-traversal guard: target must live under <root>/<id>/.
    const allowedPrefix = resolve(rootResolved, id) + sep
    if (!target.startsWith(allowedPrefix)) {
      return forbidden('Path escapes configured recordings root.')
    }

    if (!existsSync(target)) return notFound(`File not found: ${file}`)

    // Delegate to net.fetch on the file:// URL — handles Range headers
    // for `<audio>` seeking automatically, no manual stream plumbing.
    return net.fetch(pathToFileURL(target).toString())
  })
}
