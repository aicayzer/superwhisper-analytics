import { NextRequest, NextResponse } from 'next/server'

import { getBuildPromise, getCache, isCacheStale, isBuilding, setBuildPromise } from '@/lib/cache'
import { buildCache, getSuperwhisperPath } from '@/lib/scanner'
import type { RecordingListItem, RecordingsResponse } from '@/lib/types'

async function ensureCache() {
  const swPath = getSuperwhisperPath()
  if (!swPath) return null

  if (!isCacheStale(swPath)) return getCache()

  if (isBuilding()) {
    return await getBuildPromise()
  }

  const promise = buildCache(swPath)
  setBuildPromise(promise)
  return await promise
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl
  const profile = searchParams.get('profile')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(10, parseInt(searchParams.get('pageSize') ?? '25')))
  const search = (searchParams.get('search') ?? '').toLowerCase().trim()
  const dateFrom = searchParams.get('dateFrom') ?? ''
  const dateTo = searchParams.get('dateTo') ?? ''
  const mode = searchParams.get('mode') ?? ''

  if (profile === 'on') {
    // Legacy profile has no per-recording data
    return NextResponse.json({ items: [], total: 0, page: 1, pageSize, legacy: true } satisfies RecordingsResponse & { legacy: boolean })
  }

  const cache = await ensureCache()
  if (!cache) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 })
  }

  let filtered = cache.recordings

  if (search) {
    filtered = filtered.filter(
      (r) => r.result.toLowerCase().includes(search) || r.modeName.toLowerCase().includes(search)
    )
  }
  if (dateFrom) filtered = filtered.filter((r) => r.datetime.slice(0, 10) >= dateFrom)
  if (dateTo) filtered = filtered.filter((r) => r.datetime.slice(0, 10) <= dateTo)
  if (mode) filtered = filtered.filter((r) => r.modeName === mode)

  const total = filtered.length
  const items: RecordingListItem[] = filtered
    .slice((page - 1) * pageSize, page * pageSize)
    .map((r) => ({
      id: r.id,
      datetime: r.datetime,
      modeName: r.modeName,
      wordCount: r.wordCount,
      duration: r.duration,
      wordsPerMinute: r.wordsPerMinute,
      primaryTopic: r.primaryTopic,
      excerpt: r.result.slice(0, 120).trim(),
    }))

  return NextResponse.json({ items, total, page, pageSize } satisfies RecordingsResponse)
}
