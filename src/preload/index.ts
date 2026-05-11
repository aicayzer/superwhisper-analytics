import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { api } from './api'

// `contextIsolation: true` is set in main; the world bridge below is the
// only path for exposing main-side APIs to the renderer.
try {
  contextBridge.exposeInMainWorld('electron', electronAPI)
  contextBridge.exposeInMainWorld('api', api)
} catch (error) {
  console.error(error)
}
