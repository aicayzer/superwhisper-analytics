import { MymeClient } from '@mymehq/sdk'
import { getConfig } from '../config'
import { readCredential } from './tokens'

/**
 * Cached `MymeClient` instance built from the persisted endpoint + the
 * decrypted credential. Invalidated whenever the credential is cleared
 * (on disconnect) or the endpoint changes (`setEndpoint`).
 *
 * The plan called for an OAuth `TokenProvider` here. Staging's OAuth
 * path can't bootstrap a device-flow client today (see the running
 * log), so we use the SDK's static `apiKey` credential instead — same
 * `MymeClient` surface, simpler bootstrapping. The shape of this file
 * stays unchanged when OAuth becomes viable: build the client from a
 * `tokenProvider` instead of `apiKey`.
 */

let cached: { client: MymeClient; endpoint: string; key: string } | null = null

/**
 * Return a configured `MymeClient`, or null if the integration has no
 * credential yet (the renderer is responsible for not calling sync APIs
 * in that state, but we guard defensively).
 */
export function getClient(): MymeClient | null {
  const endpoint = getConfig().myme.endpoint
  const key = readCredential()
  if (!key) {
    cached = null
    return null
  }
  if (cached && cached.endpoint === endpoint && cached.key === key) {
    return cached.client
  }
  const client = new MymeClient({ url: endpoint, apiKey: key })
  cached = { client, endpoint, key }
  return client
}

/** Drop the cached client. Call on disconnect / endpoint change so the
 *  next `getClient()` rebuilds against fresh credentials. */
export function invalidateClient(): void {
  cached = null
}
