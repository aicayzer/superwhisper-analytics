/**
 * Lazy waveform-peak decoding for the transcript detail screen.
 *
 * Real recordings don't ship pre-computed peaks (the scanner skips that
 * work — 11k WAVs at ~30s avg = 28GB of audio that we'd otherwise have
 * to decode at startup). Instead, the transcript detail screen calls
 * `decodePeaks(url)` on mount; the result populates the Waveform
 * component when ready.
 *
 * Pipeline:
 *   1. fetch the audio via the sw:// custom protocol
 *   2. decodeAudioData via Web Audio API
 *   3. decimate to N max-abs peaks (one bar per "peak" in the SVG)
 *
 * Caching by URL, sharing the in-flight Promise across concurrent
 * callers, and lazily creating a single AudioContext (heavy to spin
 * up) are all worth the small complexity.
 */

const cache = new Map<string, Promise<number[]>>()
let context: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!context) context = new AudioContext()
  return context
}

function decimate(audio: AudioBuffer, peakCount: number): number[] {
  // SuperWhisper recordings are mono (verified via `file output.wav`);
  // first channel carries the audio.
  const channel = audio.getChannelData(0)
  const step = Math.max(1, Math.floor(channel.length / peakCount))
  const peaks: number[] = []
  for (let i = 0; i < peakCount; i++) {
    const start = i * step
    const end = Math.min(channel.length, start + step)
    let max = 0
    for (let j = start; j < end; j++) {
      const v = Math.abs(channel[j] ?? 0)
      if (v > max) max = v
    }
    peaks.push(max)
  }
  return peaks
}

/**
 * Returns a Promise that resolves to peak heights in [0, 1] for the
 * given audio URL. Cached by URL; concurrent callers share the same
 * decode pass. If decoding fails the cache entry is evicted so the
 * next call can retry.
 */
export function decodePeaks(url: string, peakCount = 512): Promise<number[]> {
  const cached = cache.get(url)
  if (cached) return cached

  const work = (async (): Promise<number[]> => {
    const res = await fetch(url)
    if (!res.ok) throw new Error(`audio fetch failed (${res.status}) for ${url}`)
    const buf = await res.arrayBuffer()
    const audio = await getAudioContext().decodeAudioData(buf)
    return decimate(audio, peakCount)
  })()

  cache.set(url, work)
  work.catch(() => cache.delete(url))
  return work
}
