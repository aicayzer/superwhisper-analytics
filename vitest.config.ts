import { resolve } from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  // Mirror the tsconfig path aliases so source files that import via
  // `@shared/*` / `@renderer/*` resolve under vitest the same way they
  // do under electron-vite. Without these the test runner falls back to
  // node resolution and fails on the alias.
  resolve: {
    alias: {
      '@shared': resolve(__dirname, 'src/shared'),
      '@renderer': resolve(__dirname, 'src/renderer/src')
    }
  },
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    environment: 'jsdom',
    passWithNoTests: true,
    coverage: {
      reporter: ['text', 'html'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.d.ts', 'src/**/*.{test,spec}.{ts,tsx}']
    }
  }
})
