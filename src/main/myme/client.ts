import { MymeClient } from '@mymehq/sdk'
import { StoredTokenProvider } from '@mymehq/sdk/auth'
import { getConfig } from '../config'
import { readCredential } from './tokens'
import { SafeStorageTokenStorage } from './token-storage'

/**
 * Cached `MymeClient` instance built from the persisted endpoint + the
 * decrypted credential. Invalidated whenever the credential is cleared
 * (on disconnect) or the endpoint changes (`setEndpoint`).
 *
 * Two credential shapes are supported:
 *
 *   - **API key** (`{ kind: 'api-key', key }`) — passed straight through
 *     as the SDK's static `apiKey` credential. Dev/escape hatch.
 *   - **OAuth** (`{ kind: 'oauth', clientId, tokens }`) — wrapped in the
 *     SDK's `StoredTokenProvider`. Refresh + persistence are owned by
 *     the SDK (post-T-214 the token endpoint is discovered from
 *     `/.well-known/oauth-authorization-server`, eliminating the
 *     hardcoded `/auth/token` that broke against staging after the
 *     T-131 Better Auth migration). Persistence is bridged through
 *     `SafeStorageTokenStorage`, which round-trips through the
 *     existing `safeStorage`-backed credential file.
 */

let cached: { client: MymeClient; endpoint: string; cacheKey: string } | null = null

/** Build a discriminating cache key so a credential rotation (e.g. a
 *  refresh that changes the refresh token) rebuilds the client. */
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
    // The SDK's `StoredTokenProvider` hydrates lazily from storage on
    // the first `getAccessToken()` call — no explicit hydrate here. It
    // also discovers the token endpoint from `.well-known` on the first
    // refresh, so we don't pass a `tokenEndpoint` literal.
    const storage = new SafeStorageTokenStorage(cred.clientId)
    const origin = new URL(endpoint).origin
    const storageKey = `myme.auth.tokens:${origin}:${cred.clientId}`
    const tokenProvider = new StoredTokenProvider({
      issuer: endpoint,
      clientId: cred.clientId,
      storage,
      storageKey
    })
    client = new MymeClient({ url: endpoint, tokenProvider })
  }
  cached = { client, endpoint, cacheKey }
  return client
}

/** Drop the cached client. Call on disconnect / endpoint change so the
 *  next `getClient()` rebuilds against fresh credentials. */
export function invalidateClient(): void {
  cached = null
}
