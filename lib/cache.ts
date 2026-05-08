import type { CacheState } from './types'

// Global in-process cache — survives across requests in dev and production.
// Invalidated on path change or explicit refresh.
let cache: CacheState | null = null
let building = false
let buildPromise: Promise<CacheState> | null = null

export function getCache(): CacheState | null {
  return cache
}

export function setCache(state: CacheState): void {
  cache = state
}

export function invalidateCache(): void {
  cache = null
}

export function isCacheStale(path: string): boolean {
  return !cache || cache.path !== path
}

export function getBuildPromise(): Promise<CacheState> | null {
  return building ? buildPromise : null
}

export function setBuildPromise(p: Promise<CacheState>): void {
  building = true
  buildPromise = p
  p.then((state) => {
    cache = state
    building = false
    buildPromise = null
  }).catch(() => {
    building = false
    buildPromise = null
  })
}

export function isBuilding(): boolean {
  return building
}
