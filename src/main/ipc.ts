import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type { HydratePayload } from '@shared/types'
import { defaultPath, getConfig, isPathValid, setConfig } from './config'
import { hydrate, reindex, setFillerWords } from './cache'
import { disableWatch, enableWatch } from './watcher'
import type { ConfigStatus } from '../preload/api'

/**
 * Central IPC registration. Called once on app ready.
 *
 * Each `handle` mirrors a method on the typed bridge in
 * `src/preload/api.ts` — keep the channel names + signatures in sync.
 */

function buildStatus(): ConfigStatus {
  const config = getConfig()
  return {
    path: config.superwhisperPath,
    isValid: isPathValid(config.superwhisperPath),
    defaultPath: defaultPath(),
    fillerWords: config.fillerWords,
    watchFolder: config.watchFolder,
    transcriptsOnly: config.transcriptsOnly
  }
}

/** Sync the fs.watch state with whatever the persisted config says.
 *  Called after any config update that could change path or watch toggle. */
function syncWatcher(): void {
  const config = getConfig()
  if (config.watchFolder && config.superwhisperPath && isPathValid(config.superwhisperPath)) {
    enableWatch(config.superwhisperPath)
  } else {
    disableWatch()
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('config:status', (): ConfigStatus => buildStatus())

  ipcMain.handle('config:setPath', (_, path: string | null): ConfigStatus => {
    setConfig({ superwhisperPath: path })
    syncWatcher()
    return buildStatus()
  })

  ipcMain.handle('config:setWatchFolder', (_, enabled: boolean): ConfigStatus => {
    setConfig({ watchFolder: enabled })
    syncWatcher()
    return buildStatus()
  })

  ipcMain.handle('config:setTranscriptsOnly', (_, enabled: boolean): ConfigStatus => {
    setConfig({ transcriptsOnly: enabled })
    return buildStatus()
  })

  ipcMain.handle('dialog:pickFolder', async (event): Promise<string | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const opts = {
      properties: ['openDirectory' as const, 'createDirectory' as const],
      title: 'Choose your SuperWhisper recordings folder'
    }
    const result = win ? await dialog.showOpenDialog(win, opts) : await dialog.showOpenDialog(opts)
    if (result.canceled || result.filePaths.length === 0) return null
    return result.filePaths[0] ?? null
  })

  ipcMain.handle('shell:openExternal', async (_, url: string): Promise<void> => {
    await shell.openExternal(url)
  })

  ipcMain.handle('data:hydrate', (): HydratePayload => hydrate())
  ipcMain.handle('data:reindex', (): HydratePayload => reindex())
  ipcMain.handle(
    'data:setFillerWords',
    (_, words: string[]): HydratePayload => setFillerWords(words)
  )

  // Apply the persisted watch-folder preference on startup.
  syncWatcher()
}
