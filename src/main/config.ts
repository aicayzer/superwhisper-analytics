import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { homedir } from 'os'
import { dirname, join } from 'path'
import type { Config } from '../preload/api'

/**
 * Persisted user config. Lives at `<userData>/config.json`.
 *
 * Only field today is `superwhisperPath` — the absolute path to the
 * SuperWhisper recordings folder. Stored as the recordings folder
 * itself (not its parent) so resolution is unambiguous.
 */

const CANDIDATE_PATHS = [
  join(homedir(), 'Library/Application Support/com.superduper.superwhisper/recordings'),
  join(homedir(), 'Services/superwhisper/recordings')
]

const DEFAULT_CONFIG: Config = {
  superwhisperPath: null
}

function configFilePath(): string {
  return join(app.getPath('userData'), 'config.json')
}

export function getConfig(): Config {
  const file = configFilePath()
  if (!existsSync(file)) return { ...DEFAULT_CONFIG }
  try {
    const raw = readFileSync(file, 'utf-8')
    const parsed = JSON.parse(raw) as Partial<Config>
    return { ...DEFAULT_CONFIG, ...parsed }
  } catch (err) {
    console.warn('[config] failed to read config.json, falling back to defaults:', err)
    return { ...DEFAULT_CONFIG }
  }
}

export function setConfig(patch: Partial<Config>): Config {
  const merged: Config = { ...getConfig(), ...patch }
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
