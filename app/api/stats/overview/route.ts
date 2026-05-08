import { NextRequest, NextResponse } from 'next/server'

import { getBuildPromise, getCache, isCacheStale, isBuilding, setBuildPromise } from '@/lib/cache'
import { getLegacyProfile } from '@/lib/legacy'
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

export async function GET(req: NextRequest) {
  const profile = req.nextUrl.searchParams.get('profile')

  if (profile === 'on') {
    const legacy = await getLegacyProfile().catch(() => null)
    if (!legacy) return NextResponse.json({ error: 'no_legacy_data' }, { status: 404 })
    return NextResponse.json({
      overview: legacy.overview,
      dailySummaries: legacy.dailySummaries,
      weeklyTrends: [],
      topicStats: legacy.topicStats,
    })
  }

  const cache = await ensureCache()
  if (!cache) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

  return NextResponse.json({
    overview: cache.overview,
    dailySummaries: cache.dailySummaries,
    weeklyTrends: cache.weeklyTrends,
    topicStats: cache.topicStats,
  })
}
