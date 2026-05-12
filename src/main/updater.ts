import { BrowserWindow, dialog } from 'electron'
import { autoUpdater } from 'electron-updater'
import type { UpdaterStatus } from '../preload/api'

/**
 * Auto-update wiring for production builds.
 *
 * electron-builder publishes `latest-mac.yml` alongside the .dmg + .zip
 * on every GitHub Release. electron-updater consumes that file to
 * decide whether a newer version exists. The check happens silently on
 * launch; if a new version is available it downloads in the
 * background, and when the download completes a native dialog asks the
 * user to restart.
 *
 * The renderer can also trigger a manual check via the
 * `window.api.updater.check()` IPC bridge — wired in `ipc.ts` and
 * surfaced as a "Check for updates" button in Settings → About.
 *
 * Dev builds skip auto-update entirely (electron-updater errors on a
 * non-packaged app), so `initAutoUpdater` is a no-op when running
 * under electron-vite dev.
 */

// Re-export so other main files can import the type from `./updater`
// without reaching into preload/.
export type { UpdaterStatus }

let currentStatus: UpdaterStatus = { kind: 'idle' }
let initialised = false

/** Broadcast to every open BrowserWindow so the Settings card refreshes. */
function broadcast(status: UpdaterStatus): void {
  currentStatus = status
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send('updater:status', status)
  }
}

export function getUpdaterStatus(): UpdaterStatus {
  return currentStatus
}

/**
 * Wire the autoUpdater event lifecycle and kick off an initial silent
 * check on app launch. Safe to call multiple times — subsequent calls
 * are no-ops once the listeners are attached.
 */
export function initAutoUpdater(): void {
  if (initialised) return
  initialised = true

  // Verbose-but-not-spammy log level so update activity shows up in
  // the main process console without flooding it.
  autoUpdater.logger = console
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => broadcast({ kind: 'checking' }))

  autoUpdater.on('update-available', (info: { version: string }) => {
    broadcast({ kind: 'available', version: info.version })
  })

  autoUpdater.on('update-not-available', (info: { version: string }) => {
    broadcast({ kind: 'up-to-date', version: info.version })
  })

  autoUpdater.on('download-progress', (progress: { percent: number }) => {
    broadcast({ kind: 'downloading', percent: Math.round(progress.percent) })
  })

  autoUpdater.on('update-downloaded', (info: { version: string }) => {
    broadcast({ kind: 'downloaded', version: info.version })
    // Native macOS dialog so the prompt is visible regardless of which
    // app window has focus.
    const choice = dialog.showMessageBoxSync({
      type: 'info',
      buttons: ['Restart', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: 'Update ready',
      message: `Version ${info.version} has been downloaded.`,
      detail: 'Restart SuperWhisper Analytics to apply the update.'
    })
    if (choice === 0) autoUpdater.quitAndInstall()
  })

  autoUpdater.on('error', (err: Error) => {
    broadcast({ kind: 'error', message: err.message })
  })

  // Defer the first check so it doesn't race the window's initial render.
  setTimeout(() => {
    void autoUpdater.checkForUpdates().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err)
      broadcast({ kind: 'error', message })
    })
  }, 4_000)
}

/**
 * Run a manual check now. Resolves once the check completes (the
 * UpdaterStatus events fire alongside via broadcast).
 */
export async function checkForUpdatesManually(): Promise<void> {
  if (!initialised) initAutoUpdater()
  try {
    await autoUpdater.checkForUpdates()
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    broadcast({ kind: 'error', message })
  }
}
