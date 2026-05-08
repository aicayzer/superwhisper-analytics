import { NextRequest, NextResponse } from 'next/server'

import { getBuildPromise, getCache, isCacheStale, isBuilding, setBuildPromise } from '@/lib/cache'
import { buildCache, getSuperwhisperPath } from '@/lib/scanner'

async function ensureCache() {
  const swPath = getSuperwhisperPath()
  if (!swPath) return null
  if (!isCacheStale(swPath)) return getCache()
  if (isBuilding()) return await getBuildPromise()
  const promise = buildCache(swPath)
  setBuildPromise(promise)
  return await promise
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const cache = await ensureCache()
  if (!cache) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

  const recording = cache.recordings.find((r) => r.id === id)
  if (!recording) return NextResponse.json({ error: 'not_found' }, { status: 404 })

  return NextResponse.json(recording)
}
