import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

/**
 * Encrypted-on-disk storage for the Myme credential.
 *
 * `safeStorage` is Keychain-backed on macOS (the only platform this app
 * targets) — the blob written to disk is opaque ciphertext that can only
 * be decrypted on the machine that wrote it, under the same user. If the
 * Keychain is unavailable (extremely unlikely on macOS) the helpers
 * degrade gracefully — read returns null, write returns false — so the
 * rest of the integration stays optional.
 *
 * On disk: `<userData>/myme-credential.enc` — a single binary file
 * containing the encrypted JSON-encoded credential blob. Written via the
 * write-temp + rename idiom so a crash mid-write doesn't corrupt the
 * file.
 *
 * The credential is a discriminated union of:
 *   - `{ kind: 'api-key', key }` — user-pasted API key (dev/escape hatch)
 *   - `{ kind: 'oauth', clientId, tokens: { access_token, refresh_token,
 *      access_expires_at, scope } }` — device-flow tokens
 *
 * Older installs that pre-date device-flow stored a single string here.
 * On read we transparently up-convert a raw string to the `api-key`
 * shape so an existing API-key connection survives the format change
 * without forcing a reconnect.
 */

const CREDENTIAL_FILE = 'myme-credential.enc'

export interface OAuthTokenBundle {
  access_token: string
  refresh_token: string
  /** Unix ms. */
  access_expires_at: number
  scope: string
}

export type StoredCredential =
  | { kind: 'api-key'; key: string }
  | { kind: 'oauth'; clientId: string; tokens: OAuthTokenBundle }

function filePath(): string {
  return join(app.getPath('userData'), CREDENTIAL_FILE)
}

/** True when an encrypted credential file is present. Does not attempt
 *  to decrypt — useful for boot-time "do we have a token to try?"
 *  without paying the safeStorage cost. */
export function credentialExists(): boolean {
  return existsSync(filePath())
}

/** Read and decrypt the stored credential. Returns null on any failure
 *  (missing file, safeStorage unavailable, decryption error). Never
 *  throws — Myme is optional and shouldn't break the rest of the app.
 *
 *  A legacy raw-string payload is up-converted to the `api-key` shape
 *  transparently so existing installs don't need to reconnect. */
export function readCredential(): StoredCredential | null {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[myme] safeStorage unavailable — cannot decrypt credential')
      return null
    }
    const path = filePath()
    if (!existsSync(path)) return null
    const buf = readFileSync(path)
    const decoded = safeStorage.decryptString(buf)
    // Try JSON first. If it parses, the on-disk file was written by the
    // current code path — validate the shape and return (or null on a
    // shape mismatch; we never silently fall back to legacy in that case
    // because the only way to land here with valid JSON is the new
    // format). If JSON parsing fails, the file is from the pre-T-164
    // bare-string era — up-convert it.
    let parsed: unknown
    try {
      parsed = JSON.parse(decoded)
    } catch {
      if (decoded.length > 0) return { kind: 'api-key', key: decoded }
      return null
    }
    return validate(parsed)
  } catch (err) {
    console.warn('[myme] failed to read credential:', err)
    return null
  }
}

/** Encrypt and persist the credential. Returns true on success, false
 *  on any failure (safeStorage unavailable, write error). */
export function writeCredential(value: StoredCredential): boolean {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[myme] safeStorage unavailable — cannot encrypt credential')
      return false
    }
    const path = filePath()
    mkdirSync(dirname(path), { recursive: true })
    const tmp = path + '.tmp'
    writeFileSync(tmp, safeStorage.encryptString(JSON.stringify(value)))
    renameSync(tmp, path)
    return true
  } catch (err) {
    console.warn('[myme] failed to write credential:', err)
    return false
  }
}

/** Delete the persisted credential. Safe to call when no credential
 *  exists. */
export function clearCredential(): void {
  const path = filePath()
  if (existsSync(path)) {
    try {
      unlinkSync(path)
    } catch (err) {
      console.warn('[myme] failed to delete credential:', err)
    }
  }
}

/** Defensive parse — accept either credential variant; reject anything
 *  else so a corrupted file forces a fresh reconnect rather than wedging
 *  on bad data. */
function validate(parsed: unknown): StoredCredential | null {
  if (typeof parsed !== 'object' || parsed === null) return null
  const obj = parsed as Record<string, unknown>
  if (obj.kind === 'api-key' && typeof obj.key === 'string' && obj.key.length > 0) {
    return { kind: 'api-key', key: obj.key }
  }
  if (
    obj.kind === 'oauth' &&
    typeof obj.clientId === 'string' &&
    typeof obj.tokens === 'object' &&
    obj.tokens !== null
  ) {
    const t = obj.tokens as Record<string, unknown>
    if (
      typeof t.access_token === 'string' &&
      typeof t.refresh_token === 'string' &&
      typeof t.access_expires_at === 'number' &&
      typeof t.scope === 'string'
    ) {
      return {
        kind: 'oauth',
        clientId: obj.clientId,
        tokens: {
          access_token: t.access_token,
          refresh_token: t.refresh_token,
          access_expires_at: t.access_expires_at,
          scope: t.scope
        }
      }
    }
  }
  return null
}
