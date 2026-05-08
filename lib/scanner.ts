import fs from 'fs/promises'
import path from 'path'

import {
  buildDailySummaries,
  buildDayOfWeek,
  buildFillerSummary,
  buildHourlyPatterns,
  buildModeStats,
  buildOverview,
  buildTopicStats,
  buildWeeklyTrends,
  buildWordFrequency,
  buildWPMTrend,
  classifyTopics,
  computeFillerWords,
  computeWPM,
  countSentences,
  countWords,
} from './analytics'
import type { CacheState, Recording } from './types'

interface RawMeta {
  result?: string
  rawResult?: string
  duration?: number
  processingTime?: number
  datetime?: string
  appVersion?: string
  modelKey?: string
  modelName?: string
  languageModelName?: string
  modeName?: string
  prompt?: string
  languageSelected?: string
  recordingDevice?: string
  segments?: Array<{ start: number; end: number; text: string }>
  systemAudioEnabled?: boolean
  translationEnabled?: boolean
  literalPunctuationEnabled?: boolean
  realtimeEnabled?: boolean
  applicationContextEnabled?: boolean
  separateSpeakersEnabled?: boolean
}

async function parseRecording(dir: string, id: string): Promise<Recording | null> {
  const metaPath = path.join(dir, id, 'meta.json')
  const audioPath = path.join(dir, id, 'output.wav')

  let raw: RawMeta
  try {
    const text = await fs.readFile(metaPath, 'utf-8')
    raw = JSON.parse(text)
  } catch {
    return null
  }

  let hasAudio = false
  try {
    await fs.access(audioPath)
    hasAudio = true
  } catch {
    // no audio file
  }

  const result = raw.result ?? ''
  const duration = raw.duration ?? 0
  const wordCount = countWords(result)
  const sentenceCount = countSentences(result)
  const wordsPerMinute = computeWPM(wordCount, duration)
  const { count: fillerWordCount, pct: fillerWordPct, breakdown: fillerBreakdown } = computeFillerWords(result)
  const { primary: primaryTopic, secondary: secondaryTopics } = classifyTopics(result)

  return {
    id,
    result,
    duration,
    datetime: raw.datetime ?? new Date(parseInt(id)).toISOString(),
    modeName: raw.modeName ?? 'Default',
    modelKey: raw.modelKey ?? '',
    modelName: raw.modelName ?? '',
    appVersion: raw.appVersion ?? '',
    recordingDevice: raw.recordingDevice ?? '',
    languageSelected: raw.languageSelected ?? 'en',
    segments: raw.segments ?? [],
    systemAudioEnabled: raw.systemAudioEnabled ?? false,
    realtimeEnabled: raw.realtimeEnabled ?? false,
    translationEnabled: raw.translationEnabled ?? false,
    wordCount,
    wordsPerMinute,
    sentenceCount,
    fillerWordCount,
    fillerWordPct,
    fillerBreakdown,
    primaryTopic,
    secondaryTopics,
    hasAudio,
  }
}

const BATCH_SIZE = 200

export async function buildCache(superwhisperPath: string): Promise<CacheState> {
  const recordingsDir = path.join(superwhisperPath, 'recordings')

  let entries: string[]
  try {
    entries = await fs.readdir(recordingsDir)
  } catch {
    throw new Error(`Cannot read recordings directory: ${recordingsDir}`)
  }

  // Parse in batches to avoid overwhelming the FS
  const recordings: Recording[] = []
  for (let i = 0; i < entries.length; i += BATCH_SIZE) {
    const batch = entries.slice(i, i + BATCH_SIZE)
    const results = await Promise.all(batch.map((id) => parseRecording(recordingsDir, id)))
    for (const r of results) {
      if (r) recordings.push(r)
    }
  }

  // Sort newest first
  recordings.sort((a, b) => b.datetime.localeCompare(a.datetime))

  const dateRange = recordings.length
    ? {
        start: recordings[recordings.length - 1].datetime.slice(0, 10),
        end: recordings[0].datetime.slice(0, 10),
      }
    : { start: '', end: '' }

  const dailySummaries = buildDailySummaries(recordings)

  return {
    recordings,
    builtAt: Date.now(),
    path: superwhisperPath,
    overview: buildOverview(recordings, dateRange),
    dailySummaries,
    hourlyPatterns: buildHourlyPatterns(recordings),
    dayOfWeek: buildDayOfWeek(recordings),
    weeklyTrends: buildWeeklyTrends(dailySummaries),
    wordFrequency: buildWordFrequency(recordings),
    fillerSummary: buildFillerSummary(recordings),
    wpmTrend: buildWPMTrend(dailySummaries),
    modeStats: buildModeStats(recordings),
    topicStats: buildTopicStats(recordings),
  }
}

export function getSuperwhisperPath(): string {
  return process.env.SUPERWHISPER_PATH ?? ''
}

export function getAudioPath(superwhisperPath: string, id: string): string {
  return path.join(superwhisperPath, 'recordings', id, 'output.wav')
}
