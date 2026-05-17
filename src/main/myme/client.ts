import { MymeClient } from '@mymehq/sdk'
import { getConfig } from '../config'
import { readCredential, writeCredential, type OAuthTokenBundle } from './tokens'

/**
 * Cached `MymeClient` instance built from the persisted endpoint + the
 * decrypted credential. Invalidated whenever the credential is cleared
 * (on disconnect) or the endpoint changes (`setEndpoint`).
 *
 * Two credential shapes are supported:
 *
 *   - **API key** (`{ kind: 'api-key', key }`) — passed straight through
 *     as the SDK's static `apiKey` credential. Dev/escape hatch.
 *   - **OAuth** (`{ kind: 'oauth', clientId, tokens }`) — wrapped in a
 *     minimal `TokenProvider` that proactively refreshes when < 60s
 *     remain on the access token. Single-flight refresh, persists the
 *     rotated bundle back through `tokens.ts` so the on-disk credential
 *     stays current.
 */

const REFRESH_WINDOW_MS = 60_000

let cached: { client: MymeClient; endpoint: string; cacheKey: string } | null = null

/** Build a discriminating cache key so a credential rotation (e.g. a
 *  refresh that changes the access token) rebuilds the client. */
function credentialCacheKey(): string | null {
  const cred = readCredential()
  if (!cred) return null
  if (cred.kind === 'api-key') return `apikey:${cred.key}`
  return `oauth:${cred.clientId}:${cred.tokens.refresh_token}`
}

/**
 * Return a configured `MymeClient`, or null if the integration has no
 * credential yet (the renderer is responsible for not calling sync APIs
 * in that state, but we guard defensively).
 */
export function getClient(): MymeClient | null {
  const endpoint = getConfig().myme.endpoint
  const cred = readCredential()
  if (!cred) {
    cached = null
    return null
  }
  const cacheKey = credentialCacheKey()
  if (!cacheKey) {
    cached = null
    return null
  }
  if (cached && cached.endpoint === endpoint && cached.cacheKey === cacheKey) {
    return cached.client
  }
  let client: MymeClient
  if (cred.kind === 'api-key') {
    client = new MymeClient({ url: endpoint, apiKey: cred.key })
  } else {
    client = new MymeClient({
      url: endpoint,
      tokenProvider: buildOAuthTokenProvider(endpoint, cred.clientId, cred.tokens)
    })
  }
  cached = { client, endpoint, cacheKey }
  return client
}

/** Drop the cached client. Call on disconnect / endpoint change so the
 *  next `getClient()` rebuilds against fresh credentials. */
export function invalidateClient(): void {
  cached = null
}

/**
 * Minimal `TokenProvider` shape the SDK requires for OAuth-authed
 * clients. Owns its in-memory copy of the bundle so subsequent
 * `getAccessToken()` calls don't pay the safeStorage decrypt cost on
 * every request. Refresh persists the rotated bundle back to disk so the
 * next launch picks up the new tokens.
 */
interface MainTokenProvider {
  getAccessToken(): Promise<string>
}

export function buildOAuthTokenProvider(
  endpoint: string,
  clientId: string,
  initial: OAuthTokenBundle
): MainTokenProvider {
  // Local mutable copy — the source of truth between refreshes; the
  // on-disk credential is the source of truth across restarts.
  let bundle: OAuthTokenBundle = initial
  let inflight: Promise<string> | null = null

  async function refresh(): Promise<string> {
    if (inflight) return inflight
    inflight = (async () => {
      try {
        const issuer = endpoint.replace(/\/+$/, '')
        const res = await fetch(`${issuer}/auth/token`, {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            grant_type: 'refresh_token',
            refresh_token: bundle.refresh_token,
            client_id: clientId
          }).toString()
        })
        const body = (await res.json().catch(() => ({}))) as {
          access_token?: string
          refresh_token?: string
          expires_in?: number
          scope?: string
          error?: string
        }
        if (!res.ok || !body.access_token) {
          throw new Error(`Refresh failed: ${body.error ?? `${res.status} ${res.statusText}`}`)
        }
        const next: OAuthTokenBundle = {
          access_token: body.access_token,
          refresh_token: body.refresh_token ?? bundle.refresh_token,
          access_expires_at: Date.now() + (body.expires_in ?? 3600) * 1000,
          scope: body.scope ?? bundle.scope
        }
        bundle = next
        const persisted = writeCredential({ kind: 'oauth', clientId, tokens: next })
        if (!persisted) {
          // safeStorage unavailable mid-session — in-memory bundle is
          // current, but the next app launch will re-prompt. Log so the
          // condition is at least visible in diagnostics.
          console.warn(
            '[myme] writeCredential failed during token refresh; bundle held in-memory only'
          )
        }
        // Drop the cached client so the next request rebuilds against
        // the rotated cache key.
        invalidateClient()
        return next.access_token
      } catch (err) {
        // Surface refresh failures explicitly so a failed rotation is
        // visible in stderr; the exception still propagates to the
        // caller, which will surface as a sync auth error.
        console.warn(
          '[myme] token refresh failed:',
          err instanceof Error ? err.message : String(err)
        )
        throw err
      } finally {
        inflight = null
      }
    })()
    return inflight
  }

  return {
    async getAccessToken(): Promise<string> {
      // Defensive `isFinite` — a corrupt blob that slipped past the
      // tokens.ts validator would produce NaN here, which fails the
      // `remaining > REFRESH_WINDOW_MS` check and silently refreshes.
      // Better to fail-fast into the refresh path explicitly.
      const remaining = bundle.access_expires_at - Date.now()
      if (Number.isFinite(remaining) && remaining > REFRESH_WINDOW_MS) {
        return bundle.access_token
      }
      return refresh()
    }
  }
}
