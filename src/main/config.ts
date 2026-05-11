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

const CANDIDATE_PATHS = [
  join(homedir(), 'Library/Application Support/com.superduper.superwhisper/recordings'),
  join(homedir(), 'Services/superwhisper/recordings')
]

function defaultConfig(): Config {
  return {
    superwhisperPath: null,
    fillerWords: [...DEFAULT_FILLER_PHRASES],
    watchFolder: false,
    transcriptsOnly: false,
    demoMode: false
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
    const fillerWords = Array.isArray(parsed.fillerWords)
      ? normalisePhrases(parsed.fillerWords)
      : [...DEFAULT_FILLER_PHRASES]
    return {
      superwhisperPath: parsed.superwhisperPath ?? null,
      fillerWords,
      watchFolder: parsed.watchFolder === true,
      transcriptsOnly: parsed.transcriptsOnly === true,
      demoMode: parsed.demoMode === true
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
