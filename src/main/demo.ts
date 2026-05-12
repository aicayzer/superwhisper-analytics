import { buildFillers, DEFAULT_FILLER_PHRASES } from '@shared/text-metrics'
import type { Recording } from '@shared/types'

/**
 * Deterministic synthetic dataset used by demo mode.
 *
 * Plumbing: when `config.demoMode` is true, `cache.rescan()` calls
 * `buildDemoRecordings()` instead of touching disk. The aggregates
 * pipeline runs against the demo data unchanged so every screen renders
 * with realistic-looking signal.
 *
 * Generation strategy:
 *   - A phrase bank of short conversational clauses, scoped per mode.
 *   - Each recording stitches together N clauses (mode-weighted: meeting
 *     transcripts run long, coding short) into multi-sentence speech.
 *   - Fillers from the actual app-wide list are sprinkled in at a target
 *     rate so the Language analytics show realistic numbers and the Top
 *     Filler chart has something to render.
 *   - WPM is the primary lever; duration is derived as
 *     `words / target_wpm * 60`. That keeps per-recording WPM in human
 *     ranges (90-160) regardless of how long the transcript is.
 *
 * Seeded RNG so toggling demo mode is reproducible -- same data every
 * launch, same screenshots between builds.
 */

const SEED = 0x9e3779b9
const DAYS = 200
const MS_PER_DAY = 86_400_000

// Filler-injection target rate: roughly one filler every ~20 words.
const FILLER_RATE = 0.05

interface ModeSpec {
  name: string
  share: number
  /** Mean target words-per-minute; per-recording WPM jitters around this. */
  wpmMean: number
  wpmSd: number
  /** Mean number of clauses to stitch together. Meetings long, coding short. */
  clausesMean: number
  clausesSd: number
  /** Pool of plausible clauses for this mode. Each clause is one
   *  sentence; multiple clauses are joined with spaces into the
   *  transcript. */
  pool: string[]
}

// Clean, generic conversational clauses -- no personal references. Designed
// so a recording picking 8-25 of them reads as natural speech and the union
// across all modes gives a wide vocabulary (drives the "vocab growth" curve
// upward without plateauing).
const MODES: ModeSpec[] = [
  {
    name: 'Default',
    share: 0.5,
    wpmMean: 125,
    wpmSd: 12,
    clausesMean: 10,
    clausesSd: 4,
    pool: [
      'Let me think about that for a moment.',
      'I think the right answer is probably yes, but we should sanity-check the data first.',
      'My instinct is to ship the smaller version first and revisit once we have feedback.',
      'I want to capture this before I forget it.',
      'The architecture should probably lean on the existing pipeline rather than build a new one.',
      'Quick note: remember to ask about the dashboard refresh interval.',
      'The bug only reproduces on the staging environment, never locally, which points at config drift.',
      'Honestly the simplest thing would be to add a guard at the entry point.',
      'I was going to suggest moving the deadline, but I think we can hold it if we cut scope.',
      'The customer feedback is interesting -- they like the speed but the layout confuses them on mobile.',
      'I would frame the problem as a sequencing question rather than a resourcing one.',
      'Two thoughts on the rollout plan, in order of importance.',
      'The risk we should be tracking is the dependency chain, not the engineering work itself.',
      'Roughly speaking, the next quarter splits into three discrete phases.',
      'Adding it to the backlog rather than blocking on it feels right.',
      'Reminder to myself to follow up on the contract review.',
      'The metric we should be optimising for is retention, not engagement.',
      'I want to think about this more carefully before I write the response.',
      'The product surface needs to feel calmer at this density of information.',
      'A small pause here while I work out the second-order effects.',
      'On reflection, the cleaner option is probably the one we discounted on Tuesday.',
      'Trade-off worth naming explicitly: speed of iteration versus stability of the public surface.',
      'I keep coming back to the same conclusion, which suggests it is the right call.',
      'Worth flagging that this assumes the data pipeline holds up under load.',
      'My read is that we are over-engineering this and should fall back to the obvious approach.'
    ]
  },
  {
    name: 'Email',
    share: 0.22,
    wpmMean: 138,
    wpmSd: 10,
    clausesMean: 11,
    clausesSd: 4,
    pool: [
      'Thanks for the quick reply earlier.',
      'I had a chance to look through the brief and have a couple of follow-ups.',
      'Hi team, quick update on the rollout this morning.',
      'We pushed the new schema and the metrics look healthy so far.',
      'Following up on our chat yesterday -- happy to grab a slot next week if that works for you.',
      'A few items from standup that need owners, listed below.',
      'Attaching the latest design pass.',
      'Let me know if anything needs tweaking before the review tomorrow.',
      'Thanks for sending those notes.',
      'Two thoughts: first, I agree on the framing; second, the timeline feels tight but doable.',
      'Apologies for the delayed response on this one.',
      'I have looped in the right people on this thread.',
      'Confirming the kickoff is on for Thursday at four.',
      'Sharing the latest draft in a separate message shortly.',
      'Quick summary of what we agreed on the call.',
      'Action items from my side are noted in the doc.',
      'Open question for the group: is the metric definition final?',
      'I will close the loop with finance and report back tomorrow morning.',
      'No urgency on this -- happy to talk through it whenever you have a window.',
      'Reading your note carefully and will reply in detail later today.',
      'For visibility, I have copied the wider team on this.',
      'Heads-up that the deadline shifts by one week.',
      'Sharing my screen during the call to walk through the changes.',
      'A polite nudge -- the form has not been submitted yet.',
      'On the budget question, the answer is yes with the conditions outlined below.'
    ]
  },
  {
    name: 'Coding',
    share: 0.18,
    wpmMean: 108,
    wpmSd: 12,
    clausesMean: 6,
    clausesSd: 3,
    pool: [
      'Refactor the scanner so it reads meta dot json lazily.',
      'Add a guard to the data store so it does not reset state when the path is null.',
      'Wrap the audio context creation in a try-catch.',
      'Safari throws on the constructor when there is no user gesture.',
      'Push the date-range filtering up to the hook layer rather than reimplementing it in every chart.',
      'Add a unit test for the WPM calculation with zero duration -- should return zero, not infinity.',
      'Move the constants out of the component and into a shared module so they are easier to tune.',
      'Cache the decoded peaks per URL.',
      'At the moment we redecode the same WAV every time the user reopens a transcript.',
      'Bump the dependency version and run the typecheck before opening the pull request.',
      'Replace the magic number with a named constant.',
      'Inline the helper -- it is only used in one place and the indirection costs more than it saves.',
      'Memoise the aggregate so it does not recompute on every render.',
      'Extract the date arithmetic into a pure helper for unit testing.',
      'Drop the cast and let the compiler infer the type.',
      'Wrap the IPC handler in a validator so renderer-supplied payloads are checked.',
      'Switch from for-of to a reduce -- the running total is the point.',
      'Add an early return so the happy path is not nested.',
      'Migrate the test from any to a real type.',
      'Pull the colour token out of the component so theme changes propagate.',
      'Audit the bundle and code-split the chart library.',
      'Patch the type to allow null and surface the empty state in the renderer.',
      'Tighten the regex -- the current one matches too aggressively.',
      'Run the formatter and commit the result separately.',
      'Replace the side effect with a derived store value.'
    ]
  },
  {
    name: 'Meeting',
    share: 0.1,
    wpmMean: 132,
    wpmSd: 8,
    clausesMean: 24,
    clausesSd: 6,
    pool: [
      'Right, so the agenda for today: project status, the budget question, and a look at next quarter.',
      'Before we dive in -- has everyone had a chance to read the prereads?',
      "Let's go around the room.",
      'My main concern is the dependency on the data team.',
      'If their pipeline slips, our launch slips, and we have no buffer.',
      'I think the customer research is pointing us in the right direction.',
      'We need to validate the pricing assumption before committing.',
      'Lets timebox this at fifteen minutes.',
      'If we are not converging by then we take it offline and reconvene Thursday.',
      'Quick recap: we are aligned on the goal, we have two options on the table, and we need a decision by end of week.',
      'The risk register has three new items since the last review.',
      'Status on the migration: green, on track, two minor blockers being worked through.',
      'I would like to pause on hiring until we close out the planning conversation.',
      'The dashboard for this is in the shared workspace if anyone wants to dig deeper.',
      'I want to surface one trade-off explicitly before we vote.',
      'The proposal as written assumes a flat budget across the quarter.',
      'My recommendation is to greenlight option B and revisit in six weeks.',
      'A quick aside on the customer feedback patterns we have been seeing.',
      'For the team unaware, the policy change took effect last Monday.',
      'I would like to hand over to the operations team for the next ten minutes.',
      'Comparing this quarter to the last, the trend is clearly accelerating.',
      'We should probably bring legal into the next conversation on this.',
      'Two questions before we wrap: do we have alignment on the milestones, and who owns the writeup?',
      'Thanks everyone for the prep work that went into this session.',
      'Let me know in chat if you want me to follow up on anything outside the meeting.'
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

/** Box-Muller normal sample. */
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

function pickN<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  // Sample with replacement so longer recordings can still pull from a
  // moderate pool. With ~25 clauses per mode and meetings drawing ~24,
  // without-replacement would exhaust the pool.
  const out: T[] = []
  for (let i = 0; i < n; i++) {
    const j = Math.floor(rng() * arr.length)
    out.push(arr[j] as T)
  }
  return out
}

/**
 * Sprinkle filler phrases into a transcript at roughly `rate` per word.
 * Operates on word boundaries so the result still parses as natural prose
 * and the existing filler analytics (which look for surrounded matches)
 * picks the insertions up.
 */
function injectFillers(text: string, rate: number, rng: () => number): string {
  const fillers = DEFAULT_FILLER_PHRASES.filter((f) => f.length <= 20)
  if (fillers.length === 0) return text
  const words = text.split(/(\s+)/) // keep whitespace tokens
  const out: string[] = []
  for (const tok of words) {
    out.push(tok)
    if (/\s/.test(tok)) continue
    if (rng() < rate) {
      const f = fillers[Math.floor(rng() * fillers.length)] as string
      out.push(' ' + f.toLowerCase() + ',')
    }
  }
  return out.join('').replace(/,\s*,/g, ',').replace(/\s+\./g, '.')
}

function rawWordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length
}

function sentenceCount(text: string): number {
  return text.split(/[.!?]+/).filter((s) => s.trim()).length
}

/** Distribute a transcript into per-sentence segments with timed boundaries. */
function buildSegments(
  text: string,
  durationSec: number
): Array<{ start: number; end: number; text: string }> {
  const parts = text.split(/(?<=[.!?])\s+/).filter(Boolean)
  if (parts.length <= 1) return [{ start: 0, end: durationSec, text }]
  const totalLen = parts.reduce((s, p) => s + p.length, 0) || 1
  const segs: Array<{ start: number; end: number; text: string }> = []
  let t = 0
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i] as string
    const share = part.length / totalLen
    const start = t
    const end =
      i === parts.length - 1 ? durationSec : Math.min(durationSec, t + durationSec * share)
    segs.push({ start, end, text: part })
    t = end
  }
  return segs
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

    // Active-day probability: weekdays much higher than weekends.
    const activeProb = dow === 0 || dow === 6 ? 0.35 : 0.92
    if (rng() > activeProb) continue

    // Recordings per active day: weekdays denser, occasional outliers.
    const meanCount = dow === 0 || dow === 6 ? 4 : 12
    const count = Math.max(1, Math.round(gaussian(rng, meanCount, meanCount * 0.4)))

    for (let i = 0; i < count; i++) {
      const mode = pickMode(rng)
      // Time of day: cluster between 09:00 and 19:00.
      const hour = Math.max(6, Math.min(22, Math.round(gaussian(rng, 13, 3))))
      const minute = Math.floor(rng() * 60)
      const second = Math.floor(rng() * 60)
      const recTime = new Date(date)
      recTime.setHours(hour, minute, second, 0)

      // Build the transcript by stitching mode-specific clauses, then
      // sprinkling fillers in.
      const clauseCount = Math.max(1, Math.round(gaussian(rng, mode.clausesMean, mode.clausesSd)))
      const baseText = pickN(mode.pool, clauseCount, rng).join(' ')
      const result = injectFillers(baseText, FILLER_RATE, rng)

      const words = rawWordCount(result)
      const sents = sentenceCount(result)

      // Duration derives from words / WPM, with per-recording WPM jitter
      // around the mode mean. This is the inversion of the earlier
      // approach (which picked duration first) and is the thing that
      // keeps per-recording WPM in the believable 90-160 range.
      const wpm = Math.max(60, Math.round(gaussian(rng, mode.wpmMean, mode.wpmSd)))
      const durationSec = Math.max(2, Math.round((words / wpm) * 60))
      const durationMs = durationSec * 1000

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
        segments: buildSegments(result, durationSec),
        wordCount: words,
        wordsPerMinute: wpm,
        sentenceCount: sents,
        fillerCount: fillers.count,
        fillerBreakdown: fillers.breakdown,
        excerpt: result.length > 240 ? result.slice(0, 239).trimEnd() + '...' : result
      })
    }
  }

  out.sort((a, b) => b.datetime.localeCompare(a.datetime))
  return out
}
