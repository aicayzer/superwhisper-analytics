import type { TokenStorage } from '@mymehq/sdk/auth'
import { clearCredential, readCredential, writeCredential, type OAuthTokenBundle } from './tokens'

/**
 * `TokenStorage` adapter that bridges the SDK's three-method storage
 * interface to our existing `safeStorage`-backed credential file.
 *
 * The Myme app has exactly one OAuth credential at a time (single tenant,
 * single user), so the `key` parameter the SDK passes through is ignored —
 * we read and write the same credential file regardless. The clientId is
 * captured at construction time so `set()` can preserve it across token
 * rotations (the SDK's `PersistedTokens` JSON doesn't carry the
 * `client_id`, but our on-disk shape does).
 *
 * Replaces the old `buildOAuthTokenProvider` + `persistTokensFromStorage`
 * dance — the SDK's `StoredTokenProvider` now drives refresh against the
 * discovered token endpoint (post-T-131 `/auth/oauth2/token`), and this
 * adapter just makes the persistence transparent.
 */
export class SafeStorageTokenStorage implements TokenStorage {
  constructor(private readonly clientId: string) {}

  // SDK persists tokens as JSON-encoded `PersistedTokens` —
  //   { access_token, refresh_token, access_expires_at, scope }
  // which matches our `OAuthTokenBundle` shape exactly. We round-trip
  // through the credential file's `{ kind: 'oauth', clientId, tokens }`
  // wrapper so the on-disk shape stays compatible with `readCredential`
  // / `writeCredential` across the rest of the app (boot probes, status
  // checks, API-key escape hatch).

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async get(_key: string): Promise<string | null> {
    const cred = readCredential()
    if (!cred || cred.kind !== 'oauth') return null
    // Defensive: if the stored credential is for a different clientId,
    // pretend storage is empty — the SDK will throw "No active session",
    // the renderer surfaces the disconnected state, and the user
    // reconnects cleanly. Better than handing back a foreign credential.
    if (cred.clientId !== this.clientId) return null
    return JSON.stringify(cred.tokens)
  }

  async set(_key: string, value: string): Promise<void> {
    const tokens = JSON.parse(value) as OAuthTokenBundle
    const ok = writeCredential({ kind: 'oauth', clientId: this.clientId, tokens })
    if (!ok) {
      // safeStorage unavailable mid-session. The SDK's in-memory cache
      // still holds the rotated bundle, so the current process keeps
      // working — but the next app launch will re-prompt sign-in.
      // Surface as a thrown error so the SDK's caller can decide; the
      // current `persist` paths swallow it on the renderer side.
      throw new Error('safeStorage unavailable — cannot persist OAuth tokens to disk')
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async delete(_key: string): Promise<void> {
    clearCredential()
  }
}
