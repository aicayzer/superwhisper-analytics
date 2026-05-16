import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import { DEFAULT_FILLER_PHRASES, normalisePhrases } from '@shared/text-metrics'
import type { Config } from '../preload/api'

/**
 * Persisted user config. Lives at `<userData>/config.json`.
 *
 * Fields:
 *   • `superwhisperPath` — absolute path to the recordings folder itself
 *     (not its parent).
 *   • `fillerWords`     — active filler-phrase list. Older configs that
 *     only stored the path migrate transparently: the merge with
 *     DEFAULT_CONFIG injects the canonical defaults on read.
 */

// Single canonical location for SuperWhisper recordings. Non-standard
// installs use the folder picker in the welcome modal / Settings; we
// don't try to be clever about other locations.
const CANDIDATE_PATHS = [
  join(homedir(), 'Library/Application Support/com.superduper.superwhisper/recordings')
]

function defaultConfig(): Config {
  return {
    superwhisperPath: null,
    fillerWords: [...DEFAULT_FILLER_PHRASES],
    watchFolder: false,
    transcriptsOnly: false,
    demoMode: false,
    autoHideSidebar: true,
    devTools: false
  }
}

function configFilePath(): string {
  return join(app.getPath('userData'), 'config.json')
}

export function getConfig(): Config {
  const file = configFilePath()
  if (!existsSync(file)) return defaultConfig()
  try {
    const raw = readFileSync(file, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<Config>
    // Normalise fillerWords if present; fall back to the canonical
    // default otherwise. An empty array is a legitimate user choice
    // ("no filler words") and is preserved.
    //
    // Additive migration: any phrase that ships in DEFAULT_FILLER_PHRASES
    // but is absent from the persisted list gets appended. Existing user
    // entries (including custom ones) keep their order; users who have
    // explicitly removed a default phrase by editing the list will see it
    // reappear — accepted trade-off, since the alternative is shipping new
    // hesitations that never reach existing installs. An empty array
    // ([] = "no filler words") is treated as intentional and untouched.
    const persisted = Array.isArray(parsed.fillerWords)
      ? normalisePhrases(parsed.fillerWords)
      : null
    const fillerWords: string[] = (() => {
      if (persisted === null) return [...DEFAULT_FILLER_PHRASES]
      if (persisted.length === 0) return []
      const known = new Set(persisted.map((p) => p.toLowerCase()))
      const missing = DEFAULT_FILLER_PHRASES.filter((p) => !known.has(p.toLowerCase()))
      return missing.length === 0 ? persisted : normalisePhrases([...persisted, ...missing])
    })()
    return {
      superwhisperPath: parsed.superwhisperPath ?? null,
      fillerWords,
      watchFolder: parsed.watchFolder === true,
      transcriptsOnly: parsed.transcriptsOnly === true,
      demoMode: parsed.demoMode === true,
      // Default ON when absent — first-launch behaviour is auto-hide on
      // narrow windows, which matches the plan's UX intent.
      autoHideSidebar: parsed.autoHideSidebar !== false,
      devTools: parsed.devTools === true
    }
  } catch (err) {
    console.warn('[config] failed to read config.json, falling back to defaults:', err)
    return defaultConfig()
  }
}

export function setConfig(patch: Partial<Config>): Config {
  const merged: Config = { ...getConfig(), ...patch }
  if (patch.fillerWords) merged.fillerWords = normalisePhrases(patch.fillerWords)
  const file = configFilePath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(merged, null, 2), 'utf-8')
  return merged
}

/**
 * Wipe the persisted config back to defaults. Used by the "Reset app"
 * affordance in Settings so the welcome flow can be re-tested without
 * hand-editing `~/Library/Application Support/me.cyzr.superwhisper-
 * analytics/config.json`. Writes the defaults explicitly so the
 * file's mtime updates and the renderer's next `config:status` call
 * sees the cleared state.
 */
export function resetConfig(): Config {
  const fresh = defaultConfig()
  const file = configFilePath()
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, JSON.stringify(fresh, null, 2), 'utf-8')
  return fresh
}

/**
 * Probe known SuperWhisper recordings paths. Returns the first that
 * exists, or `null` if neither does (user must pick manually).
 */
export function defaultPath(): string | null {
  for (const candidate of CANDIDATE_PATHS) {
    if (existsSync(candidate)) return candidate
  }
  return null
}

/**
 * Resolve a picked path to the actual recordings directory. The user
 * might select the SuperWhisper parent folder (e.g. `.../com.super
 * duper.superwhisper`) rather than its `recordings/` subdirectory.
 * If the picked path isn't itself a valid recordings folder but has a
 * `recordings/` child that is, promote to the child — saves the user
 * having to re-navigate through the picker.
 */
export function resolveRecordingsPath(picked: string): string {
  if (isPathValid(picked)) return picked
  const sub = join(picked, 'recordings')
  if (isPathValid(sub)) return sub
  return picked
}

/**
 * Cheap validity check: directory exists and at least one of its first
 * five children contains a `meta.json`. Avoids walking all 11k entries
 * just to answer "is this the right folder?".
 */
export function isPathValid(p: string | null | undefined): boolean {
  if (!p) return false
  if (!existsSync(p)) return false
  try {
    const entries = readdirSync(p, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .slice(0, 5)
    return entries.some((e) => existsSync(join(p, e.name, 'meta.json')))
  } catch {
    return false
  }
}

/**
 * Soft check: is the configured path under the user's home directory?
 * Used to surface a heads-up in Settings — pointing the picker at a
 * system path or another user's home isn't blocked, just flagged.
 */
export function isPathInsideHome(p: string | null | undefined): boolean {
  if (!p) return true
  const home = homedir()
  return p === home || p.startsWith(home + '/')
}
