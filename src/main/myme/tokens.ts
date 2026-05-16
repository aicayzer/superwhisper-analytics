import { app, safeStorage } from 'electron'
import { existsSync, mkdirSync, readFileSync, renameSync, unlinkSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'

/**
 * Encrypted-on-disk storage for the Myme credential.
 *
 * First introduction of `safeStorage` in the repo. `safeStorage` is
 * Keychain-backed on macOS (the only platform this app targets) — the
 * blob written to disk is opaque ciphertext that can only be decrypted
 * on the machine that wrote it, under the same user. If the Keychain is
 * unavailable (extremely unlikely on macOS) the helpers degrade
 * gracefully — read returns null, write returns false — so the rest of
 * the integration stays optional.
 *
 * On disk: `<userData>/myme-credential.enc` — a single binary file
 * containing the encrypted API key bytes. Written via the
 * write-temp + rename idiom so a crash mid-write doesn't corrupt the
 * file.
 *
 * The credential shape today is a single API key. The plan called for
 * device-flow tokens (access + refresh) but staging's OAuth path
 * doesn't actually expose a way to register a device-flow client — see
 * the Myme issues running log. The encryption surface here is generic
 * enough that swapping to a JSON `{accessToken, refreshToken,
 * expiresAt}` blob later is a one-line change.
 */

const CREDENTIAL_FILE = 'myme-credential.enc'

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
 *  throws — Myme is optional and shouldn't break the rest of the app. */
export function readCredential(): string | null {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[myme] safeStorage unavailable — cannot decrypt credential')
      return null
    }
    const path = filePath()
    if (!existsSync(path)) return null
    const buf = readFileSync(path)
    return safeStorage.decryptString(buf)
  } catch (err) {
    console.warn('[myme] failed to read credential:', err)
    return null
  }
}

/** Encrypt and persist the credential. Returns true on success, false
 *  on any failure (safeStorage unavailable, write error). */
export function writeCredential(value: string): boolean {
  try {
    if (!safeStorage.isEncryptionAvailable()) {
      console.warn('[myme] safeStorage unavailable — cannot encrypt credential')
      return false
    }
    const path = filePath()
    mkdirSync(dirname(path), { recursive: true })
    const tmp = path + '.tmp'
    writeFileSync(tmp, safeStorage.encryptString(value))
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
