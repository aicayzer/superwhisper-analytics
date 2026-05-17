import { BrowserWindow, dialog, ipcMain, shell } from 'electron'
import type { HydratePayload } from '@shared/types'
import {
  defaultPath,
  getConfig,
  isPathInsideHome,
  isPathValid,
  resetConfig,
  resolveRecordingsPath,
  setConfig
} from './config'
import { hydrate, reindex, setFillerWords } from './cache'
import { checkForUpdatesManually, getUpdaterStatus, type UpdaterStatus } from './updater'
import { disableWatch, enableWatch } from './watcher'
import * as myme from './myme'
import { validBool, validString, validStringArray } from './validators'
import type {
  ConfigStatus,
  MymeMapping,
  MymeStatus,
  ProbeResult,
  TypeSummary
} from '../preload/api'

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
    isInsideHome: isPathInsideHome(config.superwhisperPath),
    defaultPath: defaultPath(),
    fillerWords: config.fillerWords,
    watchFolder: config.watchFolder,
    transcriptsOnly: config.transcriptsOnly,
    demoMode: config.demoMode,
    autoHideSidebar: config.autoHideSidebar,
    devTools: config.devTools
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

  ipcMain.handle('config:setPath', (_, path: unknown): ConfigStatus => {
    // Accept string or null; ignore anything else.
    if (path !== null && !validString(path)) return buildStatus()
    // Auto-promote a SuperWhisper parent-folder pick to its `recordings/`
    // child if the parent itself isn't a valid recordings dir. Saves
    // users having to re-navigate via the picker when they grabbed the
    // SuperWhisper container by mistake.
    const resolved = path === null ? null : resolveRecordingsPath(path)
    setConfig({ superwhisperPath: resolved })
    syncWatcher()
    return buildStatus()
  })

  ipcMain.handle('config:setWatchFolder', (_, enabled: unknown): ConfigStatus => {
    if (!validBool(enabled)) return buildStatus()
    setConfig({ watchFolder: enabled })
    syncWatcher()
    return buildStatus()
  })

  ipcMain.handle('config:setTranscriptsOnly', (_, enabled: unknown): ConfigStatus => {
    if (!validBool(enabled)) return buildStatus()
    setConfig({ transcriptsOnly: enabled })
    return buildStatus()
  })

  ipcMain.handle('config:setDemoMode', (_, enabled: unknown): ConfigStatus => {
    if (!validBool(enabled)) return buildStatus()
    setConfig({ demoMode: enabled })
    // Disable the watcher when entering demo mode — watching disk in this
    // state is wasted work, and the demo dataset isn't affected by file
    // changes anyway. Re-engaging the watch toggle when leaving demo mode
    // is the user's call.
    if (enabled) disableWatch()
    else syncWatcher()
    return buildStatus()
  })

  ipcMain.handle('config:setAutoHideSidebar', (_, enabled: unknown): ConfigStatus => {
    if (!validBool(enabled)) return buildStatus()
    setConfig({ autoHideSidebar: enabled })
    return buildStatus()
  })

  ipcMain.handle('config:setDevTools', (event, enabled: unknown): ConfigStatus => {
    if (!validBool(enabled)) return buildStatus()
    setConfig({ devTools: enabled })
    const win = BrowserWindow.fromWebContents(event.sender)
    if (win) {
      if (enabled) win.webContents.openDevTools()
      else win.webContents.closeDevTools()
    }
    return buildStatus()
  })

  // Reset everything — wipes config.json back to defaults so the
  // welcome flow shows again on next hydrate. Used by the "Reset app"
  // affordance in Settings → About.
  ipcMain.handle('config:reset', (): ConfigStatus => {
    resetConfig()
    // Watch is keyed off path, which is now null — kill any active
    // watcher so we don't leak a handle pointing at the old folder.
    disableWatch()
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

  ipcMain.handle('shell:openExternal', async (_, url: unknown): Promise<void> => {
    if (!validString(url)) return
    // Reject anything that isn't http(s) — guards against javascript:,
    // file:, and other unintended openers reaching the system handler.
    if (!/^https?:\/\//i.test(url)) return
    await shell.openExternal(url)
  })

  ipcMain.handle('data:hydrate', (): HydratePayload => hydrate())
  ipcMain.handle('data:reindex', (): HydratePayload => reindex())
  ipcMain.handle('data:setFillerWords', (_, words: unknown): HydratePayload => {
    if (!validStringArray(words)) return hydrate()
    return setFillerWords(words)
  })

  // Updater — current snapshot + manual trigger. Push notifications
  // happen out-of-band via `updater:status` on each main → renderer
  // broadcast (see `updater.ts`).
  ipcMain.handle('updater:status', (): UpdaterStatus => getUpdaterStatus())
  ipcMain.handle('updater:check', async (): Promise<UpdaterStatus> => {
    await checkForUpdatesManually()
    return getUpdaterStatus()
  })

  // Myme integration — optional, off by default. The renderer composes
  // the "disabled" UX (demo mode / no path) from configStore; main
  // always reports the sync engine's actual state. Push notifications
  // go out on `myme:status` from `src/main/myme/index.ts` whenever the
  // status transitions.
  ipcMain.handle('myme:status', (): MymeStatus => myme.getStatus())
  ipcMain.handle('myme:setEndpoint', (_, url: unknown): MymeStatus => {
    if (!validString(url)) return myme.getStatus()
    if (!/^https?:\/\//i.test(url)) return myme.getStatus()
    return myme.setEndpoint(url)
  })
  ipcMain.handle('myme:connect', (): Promise<MymeStatus> => myme.connect())
  ipcMain.handle('myme:useApiKey', (): MymeStatus => myme.useApiKey())
  ipcMain.handle('myme:cancelConnect', (): MymeStatus => myme.cancelConnect())
  ipcMain.handle('myme:submitApiKey', (_, key: unknown): Promise<MymeStatus> => {
    if (!validString(key)) return Promise.resolve(myme.getStatus())
    return myme.submitApiKey(key)
  })
  ipcMain.handle('myme:disconnect', (): MymeStatus => myme.disconnect())
  ipcMain.handle('myme:syncNow', (): Promise<MymeStatus> => myme.syncNow())
  ipcMain.handle('myme:cancelSync', (): MymeStatus => myme.cancelSync())
  ipcMain.handle('myme:setSyncLimit', (_, n: unknown): MymeStatus => {
    if (typeof n !== 'number' || !Number.isFinite(n)) return myme.getStatus()
    return myme.setSyncLimit(n)
  })
  ipcMain.handle('myme:getMapping', (): MymeMapping => myme.getMapping())
  ipcMain.handle('myme:setMapping', (_, mapping: unknown): MymeMapping => {
    // Light validation: the structure must have `recording` and
    // `session` bindings each carrying mode/typeId/fieldMap. Anything
    // missing means a renderer bug or an injection attempt — return the
    // current mapping unchanged.
    if (!isMymeMapping(mapping)) return myme.getMapping()
    return myme.setMapping(mapping)
  })
  ipcMain.handle('myme:getModeFilter', (): string[] | null => myme.getModeFilter())
  ipcMain.handle('myme:setModeFilter', (_, modes: unknown): string[] | null => {
    if (modes === null) return myme.setModeFilter(null)
    if (!validStringArray(modes)) return myme.getModeFilter()
    return myme.setModeFilter(modes)
  })
  ipcMain.handle('myme:probeConnection', (): Promise<ProbeResult> => myme.probeConnection())
  ipcMain.handle('myme:listTypes', (): Promise<TypeSummary[] | null> => myme.listServerTypes())
  ipcMain.handle('myme:registerType', (_, schema: unknown): Promise<unknown> => {
    // The SDK validates the schema shape on register; we just
    // require it's an object so we don't crash the IPC layer.
    if (typeof schema !== 'object' || schema === null) return Promise.resolve(null)
    return myme.registerType(schema as Parameters<typeof myme.registerType>[0])
  })

  // Apply the persisted watch-folder preference on startup.
  syncWatcher()
}

function isMymeMapping(value: unknown): value is MymeMapping {
  if (typeof value !== 'object' || value === null) return false
  const v = value as { recording?: unknown; session?: unknown }
  return isBinding(v.recording) && isBinding(v.session)
}

function isBinding(value: unknown): boolean {
  if (typeof value !== 'object' || value === null) return false
  const v = value as { mode?: unknown; typeId?: unknown; fieldMap?: unknown }
  if (v.mode !== 'bundled' && v.mode !== 'existing' && v.mode !== 'authored') return false
  if (typeof v.typeId !== 'string' || v.typeId.length === 0) return false
  if (typeof v.fieldMap !== 'object' || v.fieldMap === null) return false
  return true
}
