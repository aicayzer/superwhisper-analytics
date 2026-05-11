import { buildFillers } from '@shared/text-metrics'
import type { Recording } from '@shared/types'

/**
 * Deterministic synthetic dataset used by demo mode.
 *
 * Plumbing: when `config.demoMode` is true, `cache.rescan()` calls
 * `buildDemoRecordings()` instead of touching disk. The aggregates
 * pipeline runs against the demo data unchanged so every screen renders
 * with realistic-looking signal.
 *
 * Goals for the dataset:
 *   • Span 200 days (today − 200 → today) so 90d-vs-90d period comparisons
 *     have a previous period to compare against.
 *   • Multiple modes with realistic distribution — not just one mode
 *     dominating like the author's own real data does.
 *   • Active-day pattern that breathes: weekdays heavier than weekends,
 *     occasional gaps. Streak calendar should look alive.
 *   • Per-recording metrics (WPM, words, duration, fillers) drawn from
 *     plausible distributions, not just constants. Histograms light up.
 *
 * Seeded RNG so toggling demo mode is reproducible — same data every
 * launch, same screenshots between builds.
 */

const SEED = 0x9e3779b9 // Knuth multiplicative constant — arbitrary but stable.
const DAYS = 200
const MS_PER_DAY = 86_400_000

interface ModeSpec {
  name: string
  share: number // probability per recording
  /** Mean WPM for recordings in this mode. */
  wpmMean: number
  /** Mean duration in seconds. */
  durationMean: number
  /** Pool of plausible transcripts for this mode. Picked at random. */
  pool: string[]
}

const MODES: ModeSpec[] = [
  {
    name: 'Default',
    share: 0.5,
    wpmMean: 115,
    durationMean: 30,
    pool: [
      'Let me think about that for a moment — I think the answer is probably yes, but we should check the data first.',
      'Right, so the plan is to ship the next iteration on Friday and circle back on Monday with a debrief.',
      'I want to capture this thought before I lose it. The architecture should probably lean on the existing pipeline.',
      'Quick note: remember to ask Sarah about the dashboard refresh interval, it felt slow this morning.',
      'Okay so the bug only reproduces on the staging environment, never locally — that points at a config drift.',
      'Honestly the simplest thing would be to add a guard at the entry point and call it a day.',
      'I was going to suggest we move the deadline, but actually I think we can make it if we cut scope.',
      'The customer feedback is interesting — they like the speed but the layout confuses them on mobile.'
    ]
  },
  {
    name: 'Email',
    share: 0.22,
    wpmMean: 135,
    durationMean: 45,
    pool: [
      'Hi James, thanks for the quick reply earlier — I had a chance to look through the brief and have a couple of follow-ups.',
      'Hi team, quick update on the rollout. We pushed the new schema this morning and metrics look healthy so far.',
      'Hello Alex, following up on our chat yesterday — happy to grab a slot next week if that works for you.',
      'Morning all, a few items from the standup that need owners: the dashboard refresh, the migration check, and the changelog.',
      'Hi Priya, attaching the latest design pass. Let me know if anything needs tweaking before the review tomorrow.',
      'Thanks for sending those notes. Two thoughts: first, I agree on the framing; second, the timeline feels tight but doable.'
    ]
  },
  {
    name: 'Coding',
    share: 0.18,
    wpmMean: 105,
    durationMean: 22,
    pool: [
      'Refactor the scanner so it reads meta dot json lazily — currently we hit every file on startup which is the wrong default.',
      'Add a guard to the dataStore so it does not reset state when the path is null.',
      'Wrap the audio context creation in a try-catch — Safari throws on the constructor when there is no user gesture.',
      'Push the date-range filtering up to the hook layer rather than reimplementing it in every chart.',
      'Add a unit test for the WPM calculation with zero duration — should return zero, not infinity.',
      'Move the constants out of the component and into a shared module so they are easier to tune.',
      'Cache the decoded peaks per URL — at the moment we redecode the same WAV every time the user reopens a transcript.'
    ]
  },
  {
    name: 'Meeting',
    share: 0.1,
    wpmMean: 125,
    durationMean: 90,
    pool: [
      'Right, so the agenda for today: project status, the budget question, and then a quick look at next quarters roadmap.',
      'Before we dive in — has everyone had a chance to read the prereads? Okay, lets go around the room.',
      'My main concern is the dependency on the data team. If their pipeline slips, our launch slips, and we have no buffer.',
      'I think the customer research is pointing us in the right direction, but we need to validate the pricing assumption.',
      'Lets timebox this at fifteen minutes — if we are not converging by then we take it offline and reconvene Thursday.',
      'Quick recap: we are aligned on the goal, we have two options on the table, and we need a decision by end of week.'
    ]
  }
]

/** Mulberry32 PRNG seeded once per generation. Cheap, deterministic. */
function makeRng(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) | 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Approximate a normal distribution via Box-Muller. */
function gaussian(rng: () => number, mean: number, sd: number): number {
  const u = Math.max(1e-9, rng())
  const v = rng()
  return mean + sd * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

function pickMode(rng: () => number): ModeSpec {
  const r = rng()
  let acc = 0
  for (const m of MODES) {
    acc += m.share
    if (r < acc) return m
  }
  return MODES[0] as ModeSpec
}

function pickTranscript(rng: () => number, mode: ModeSpec): string {
  const i = Math.floor(rng() * mode.pool.length)
  return mode.pool[i] ?? mode.pool[0] ?? ''
}

function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).filter((s) => s.trim()).length
}

function rawWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

/**
 * Build the synthetic dataset. Recordings are emitted sorted newest-first
 * to match the real scanner's ordering convention.
 */
export function buildDemoRecordings(
  now: Date = new Date(),
  fillerPhrases: readonly string[]
): Recording[] {
  const rng = makeRng(SEED)
  const out: Recording[] = []
  const todayMs = now.getTime()

  for (let dayOffset = 0; dayOffset < DAYS; dayOffset++) {
    const dayMs = todayMs - dayOffset * MS_PER_DAY
    const date = new Date(dayMs)
    const dow = date.getDay() // 0 Sun, 6 Sat

    // Probability the user records at all that day — weekdays much higher
    // than weekends. Skews active-day count to ~150/200.
    const activeProb = dow === 0 || dow === 6 ? 0.35 : 0.92
    if (rng() > activeProb) continue

    // Recordings per active day: weekdays denser, with a long tail.
    const meanCount = dow === 0 || dow === 6 ? 4 : 12
    const count = Math.max(1, Math.round(gaussian(rng, meanCount, meanCount * 0.4)))

    for (let i = 0; i < count; i++) {
      const mode = pickMode(rng)
      // Time of day: cluster between 09:00 and 19:00 with a small spread.
      const hour = Math.max(6, Math.min(22, Math.round(gaussian(rng, 13, 3))))
      const minute = Math.floor(rng() * 60)
      const second = Math.floor(rng() * 60)
      const recTime = new Date(date)
      recTime.setHours(hour, minute, second, 0)

      const result = pickTranscript(rng, mode)
      const words = rawWordCount(result)
      const sents = sentenceCount(result)

      // Duration in seconds, gaussian around the mode's mean with a wide
      // spread, clamped to a sensible range.
      const durationSec = Math.max(
        2,
        Math.min(420, Math.round(gaussian(rng, mode.durationMean, mode.durationMean * 0.6)))
      )
      const durationMs = durationSec * 1000

      // Derive WPM from words/duration so the per-recording number is
      // self-consistent — same as the real scanner does. Add a touch of
      // multiplier noise so dots in the speaking-pace chart scatter.
      const wpmNoise = 0.7 + rng() * 0.7
      const wpm = durationMs > 0 ? Math.round((words / (durationSec / 60)) * wpmNoise) : 0

      const fillers = buildFillers(result, fillerPhrases)

      // ISO without timezone, matching the SuperWhisper format the real
      // scanner produces.
      const datetime = recTime.toISOString().slice(0, 19)
      const id = `demo-${Math.floor(recTime.getTime() / 1000)}-${i}`

      out.push({
        id,
        datetime,
        modeName: mode.name,
        modelName: 'Demo',
        appVersion: 'demo',
        recordingDevice: 'Demo microphone',
        languageSelected: 'en',
        duration: durationMs,
        processingTime: Math.round(durationMs * (0.1 + rng() * 0.2)),
        result,
        rawResult: result,
        // Segments: chunk the transcript into 1–3 segments per recording.
        segments:
          words < 12
            ? [{ start: 0, end: durationSec, text: result }]
            : segmentise(result, durationSec, rng),
        wordCount: words,
        wordsPerMinute: Math.max(0, wpm),
        sentenceCount: sents,
        fillerCount: fillers.count,
        fillerBreakdown: fillers.breakdown,
        excerpt: result.length > 240 ? result.slice(0, 239).trimEnd() + '…' : result
      })
    }
  }

  out.sort((a, b) => b.datetime.localeCompare(a.datetime))
  return out
}

function segmentise(
  text: string,
  durationSec: number,
  rng: () => number
): Array<{ start: number; end: number; text: string }> {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (parts.length <= 1) return [{ start: 0, end: durationSec, text }]
  const segs: Array<{ start: number; end: number; text: string }> = []
  // Distribute duration proportional to part length, with a tiny jitter so
  // segment boundaries don't land on exact word fractions.
  const totalLen = parts.reduce((s, p) => s + p.length, 0) || 1
  let t = 0
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] as string
    const share = part.length / totalLen
    const seg = durationSec * share * (0.85 + rng() * 0.3)
    const start = t
    const end = i === parts.length - 1 ? durationSec : Math.min(durationSec, t + seg)
    segs.push({ start, end, text: part })
    t = end
  }
  return segs
}
