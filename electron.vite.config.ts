import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { defineConfig } from 'electron-vite'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const pkg = JSON.parse(readFileSync(resolve(__dirname, 'package.json'), 'utf-8')) as {
  version: string
}

const sharedAlias = { '@shared': resolve('src/shared') }

export default defineConfig({
  main: {
    resolve: { alias: sharedAlias },
    build: {
      // electron-vite's default `externalizeDepsPlugin` marks every
      // entry in package.json `dependencies` as a runtime CJS require.
      // The Myme SDK is ESM-only — `require('@mymehq/sdk')` blows up
      // with `ERR_PACKAGE_PATH_NOT_EXPORTED`. Exclude the two packages
      // here so they're bundled into the main process output instead.
      externalizeDeps: { exclude: ['@mymehq/sdk', '@mymehq/shared'] }
    }
  },
  preload: {
    resolve: { alias: sharedAlias }
  },
  renderer: {
    define: {
      __APP_VERSION__: JSON.stringify(pkg.version)
    },
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        ...sharedAlias
      }
    },
    plugins: [react(), tailwindcss()]
  }
})
