import { BrowserWindow } from 'electron'
import { FSWatcher, watch } from 'fs'
import type { HydratePayload } from '@shared/types'
import { reindex } from './cache'

/**
 * Optional fs.watch on the SuperWhisper recordings folder.
 *
 * On macOS, `fs.watch(dir)` fires for direct-child changes (folder
 * adds, renames). SuperWhisper writes each new recording to its own
 * `<unix-timestamp>/` directory under the root, so a single watcher at
 * the root catches every fresh recording.
 *
 * We debounce — a single new recording is followed by a flurry of file
 * writes inside its folder, and macOS sometimes fires multiple events
 * for the same change. 1.5s of quiet means "settled", at which point we
 * reindex from the cached recordings layer and broadcast a fresh
 * HydratePayload to every BrowserWindow.
 *
 * The user-facing toggle (Settings → Indexing → Watch folder) flips
 * this watcher on or off via `enableWatch` / `disableWatch`. Off by
 * default; runs only when explicitly opted in.
 */

const DEBOUNCE_MS = 1500
const INVALIDATED_CHANNEL = 'data:invalidated'

let activePath: string | null = null
let watcher: FSWatcher | null = null
let debounceTimer: NodeJS.Timeout | null = null

function broadcast(payload: HydratePayload): void {
  for (const win of BrowserWindow.getAllWindows()) {
    if (win.isDestroyed()) continue
    win.webContents.send(INVALIDATED_CHANNEL, payload)
  }
}

function scheduleReindex(): void {
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    try {
      const payload = reindex()
      console.log(
        `[watcher] auto-reindex fired (${payload.count} recordings, ${payload.error ?? 'ok'})`
      )
      broadcast(payload)
    } catch (err) {
      console.warn('[watcher] auto-reindex failed', err)
    }
  }, DEBOUNCE_MS)
}

/**
 * Start watching `rootPath`. Replaces any previously-active watcher
 * (e.g. when the user picks a different recordings folder while the
 * watch toggle is on).
 */
export function enableWatch(rootPath: string): void {
  if (watcher && activePath === rootPath) return
  disableWatch()
  try {
    watcher = watch(rootPath, { persistent: false }, () => {
      scheduleReindex()
    })
    activePath = rootPath
    console.log(`[watcher] watching ${rootPath}`)
  } catch (err) {
    console.warn('[watcher] failed to watch', rootPath, err)
  }
}

export function disableWatch(): void {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
    debounceTimer = null
  }
  if (watcher) {
    watcher.close()
    watcher = null
    activePath = null
    console.log('[watcher] stopped')
  }
}

/** True when a watcher is currently active. */
export function isWatching(): boolean {
  return watcher !== null
}
