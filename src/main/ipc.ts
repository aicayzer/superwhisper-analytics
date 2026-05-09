import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import { defaultPath, getConfig, isPathValid, setConfig } from './config'
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
    defaultPath: defaultPath()
  }
}

export function registerIpcHandlers(): void {
  ipcMain.handle('config:status', (): ConfigStatus => buildStatus())

  ipcMain.handle('config:setPath', (_, path: string | null): ConfigStatus => {
    setConfig({ superwhisperPath: path })
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
}
