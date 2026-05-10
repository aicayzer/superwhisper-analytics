import { net, protocol } from 'electron'
import { existsSync } from 'fs'
import { resolve, sep } from 'path'
import { pathToFileURL } from 'url'
import { getConfig } from './config'

/**
 * Custom `sw://` protocol that streams recording audio from disk to
 * the renderer's `<audio>` element.
 *
 * URL shape: `sw://<id>/output.wav`
 *   • host  = recording id (the timestamp folder name)
 *   • path  = file inside the recording folder (today only output.wav)
 *
 * Why a custom scheme rather than `file://`? Two reasons:
 *
 *   1. The renderer is sandboxed; allowing `file://` would expose the
 *      entire filesystem. A scoped scheme is auditable.
 *   2. We can rewrite the host portion to `<configPath>/<id>/...` so
 *      the renderer never needs to know the user's actual SuperWhisper
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

    const id = parsed.host
    const file = decodeURIComponent(parsed.pathname.replace(/^\//, ''))
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
