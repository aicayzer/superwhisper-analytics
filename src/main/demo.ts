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
 *   - A bucket-driven sentence generator (below). Each recording targets
 *     a sentence-length bucket weighted to produce a healthy spread in
 *     the "Sentence length" chart (15/40/20/12/8/5 % across the six
 *     buckets), and draws all its clauses from that bucket's templates.
 *   - Templates fill slots from a shared word bank, so each rendered
 *     sentence is one of millions of combinatorial variants — that keeps
 *     the "Vocabulary growth" curve rising throughout the 200-day window
 *     instead of plateauing once the static pool is exhausted.
 *   - Modes (Default / Email / Coding / Meeting) keep their distinctive
 *     count + WPM characteristics so the mode-share donut and the WPM
 *     trend stay believable.
 *   - Fillers from the app-wide list are sprinkled in at a target rate
 *     so the Language analytics show realistic numbers and the Top
 *     Filler chart has something to render.
 *
 * Seeded RNG so toggling demo mode is reproducible — same data every
 * launch, same screenshots between builds.
 */

const SEED = 0x9e3779b9
const DAYS = 200
const MS_PER_DAY = 86_400_000

// Filler-injection target rate: roughly one filler every ~14 words.
const FILLER_RATE = 0.07

// =========================================================================
// Sentence-length bucketing
// =========================================================================

type BucketLabel = '<=5' | '6-10' | '11-15' | '16-20' | '21-25' | '25+'

interface BucketSpec {
  label: BucketLabel
  /** Target share of recordings falling into this bucket. */
  share: number
}

/** Distribution targeted by the generator. Numbers were picked to give
 *  the "Sentence length" chart a realistic spread — a sizeable mid-range
 *  modal bucket flanked by visible tails on both ends. */
const BUCKET_SPECS: BucketSpec[] = [
  { label: '<=5', share: 0.15 },
  { label: '6-10', share: 0.4 },
  { label: '11-15', share: 0.2 },
  { label: '16-20', share: 0.12 },
  { label: '21-25', share: 0.08 },
  { label: '25+', share: 0.05 }
]

// =========================================================================
// Word banks
// =========================================================================
//
// Each slot is filled from one of these lists when a template renders.
// Banks are deliberately large so the combinatorial space across all
// templates × all slot positions is huge — that's what drives the
// vocabulary-growth curve.

const BANK = {
  subject: [
    'I',
    'We',
    'The team',
    'The reviewer',
    'The user',
    'The system',
    'Engineering',
    'Product',
    'Design',
    'The customer',
    'The lead',
    'Operations',
    'Research',
    'Finance',
    'Legal',
    'Support',
    'Marketing',
    'The PM',
    'The architect',
    'The maintainer'
  ],
  subjectLower: [
    'we',
    'the team',
    'engineering',
    'product',
    'design',
    'the reviewer',
    'the lead',
    'the architect',
    'operations',
    'the PM'
  ],
  verbActive: [
    'ship',
    'merge',
    'deploy',
    'refactor',
    'review',
    'document',
    'simplify',
    'extract',
    'inline',
    'memoise',
    'cache',
    'audit',
    'profile',
    'rebase',
    'lint',
    'validate',
    'patch',
    'monitor',
    'instrument',
    'investigate',
    'rewrite',
    'tighten',
    'broaden',
    'green-light',
    'kill',
    'shelve',
    'park',
    'split',
    'consolidate',
    'untangle',
    'unblock',
    'prioritise',
    'sequence',
    'scope',
    'estimate'
  ],
  verbPast: [
    'confirmed',
    'approved',
    'declined',
    'shipped',
    'closed',
    'reopened',
    'merged',
    'reverted',
    'deployed',
    'paused',
    'resumed',
    'cancelled',
    'archived',
    'logged',
    'patched',
    'documented',
    'flagged',
    'noted',
    'highlighted',
    'surfaced',
    'raised',
    'staged',
    'queued',
    'scheduled',
    'pinned',
    'attached',
    'forwarded',
    'profiled',
    'audited'
  ],
  verbSay: [
    'mentioned',
    'flagged',
    'noted',
    'highlighted',
    'surfaced',
    'raised',
    'queried',
    'asked about',
    'pushed back on',
    'agreed with',
    'pushed for',
    'argued for',
    'pointed out',
    'suggested',
    'cautioned about',
    'doubled down on',
    'walked through'
  ],
  artifact: [
    'dashboard',
    'API',
    'migration',
    'rollout',
    'proposal',
    'report',
    'schema',
    'pipeline',
    'spec',
    'release',
    'rollback',
    'patch',
    'changelog',
    'roadmap',
    'integration',
    'webhook',
    'cron job',
    'fixture',
    'query',
    'endpoint',
    'validator',
    'parser',
    'workflow',
    'index',
    'manifest',
    'feature flag',
    'A/B test',
    'configuration',
    'snapshot',
    'cache layer',
    'queue',
    'dead-letter queue',
    'observer',
    'reducer',
    'selector',
    'middleware',
    'compiler step',
    'build artefact',
    'tooling'
  ],
  problem: [
    'blocker',
    'edge case',
    'regression',
    'memory leak',
    'flake',
    'race condition',
    'schema mismatch',
    'config drift',
    'discrepancy',
    'gap',
    'incident',
    'glitch',
    'hiccup',
    'slowdown',
    'deadlock',
    'contention',
    'hotspot',
    'anomaly',
    'deviation',
    'panic',
    'silent failure',
    'noisy retry loop'
  ],
  topic: [
    'the metric definition',
    'the pricing model',
    'the rollout plan',
    'the migration window',
    'the design brief',
    'the success criteria',
    'the engineering bandwidth',
    'the dependency map',
    'the data schema',
    'the SLO targets',
    'the security boundary',
    'the API contract',
    'the release notes',
    'the rollback plan',
    'the customer requirements',
    'the staging environment',
    'the load profile',
    'the legal review',
    'the procurement timeline',
    'the launch checklist',
    'the support runbook'
  ],
  adjective: [
    'minor',
    'major',
    'tricky',
    'simple',
    'complex',
    'cleaner',
    'tighter',
    'leaner',
    'broader',
    'narrower',
    'urgent',
    'low-priority',
    'robust',
    'fragile',
    'sustainable',
    'brittle',
    'opinionated',
    'defensive',
    'exhaustive',
    'surface-level',
    'foundational',
    'incremental',
    'orthogonal',
    'tangential',
    'compounding'
  ],
  time: [
    'today',
    'tomorrow',
    'this morning',
    'this afternoon',
    'this week',
    'next week',
    'by Friday',
    'by Monday',
    'next sprint',
    'next quarter',
    'in the upcoming review',
    'before the launch',
    'after the release',
    'over the weekend',
    'in the next standup',
    'on Thursday',
    'mid-week',
    'end of week',
    'early next week',
    'in the new year'
  ],
  timeShort: ['now', 'later', 'soon', 'shortly', 'today', 'tomorrow', 'eventually'],
  qualifier: [
    'probably',
    'definitely',
    'realistically',
    'arguably',
    'cautiously',
    'ideally',
    'pragmatically',
    'roughly',
    'broadly',
    'tentatively',
    'honestly',
    'frankly',
    'candidly',
    'naturally',
    'plainly',
    'sensibly',
    'reasonably',
    'logically',
    'ultimately',
    'fundamentally'
  ],
  reason: [
    'the API changes',
    'the data model drift',
    'scheduling conflicts',
    'team capacity',
    'the rollout risk',
    'the dependency chain',
    'the customer feedback',
    'the design review',
    'the security audit',
    'the migration deadline',
    'the load spike',
    'the test failures',
    'the lint errors',
    'the bundle bloat',
    'the perf regression',
    'limited bandwidth',
    'cross-team handoffs',
    'process overhead',
    'the staging incident',
    'the integration mismatch'
  ]
} as const

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)] as T
}

// =========================================================================
// Templates per bucket
// =========================================================================
//
// Each template returns a sentence string. Templates are written so the
// rendered sentence's word count lands within (or close to) its target
// bucket. Slot variety is what produces vocab growth — every render
// substitutes new words into the same shape.

type Template = (rng: () => number) => string

const TEMPLATES: Record<BucketLabel, Template[]> = {
  '<=5': [
    () => 'Confirmed.',
    () => 'Approved.',
    () => 'Acknowledged.',
    () => 'Done.',
    () => 'Reviewing now.',
    () => 'On it.',
    () => 'Tests pass.',
    () => 'Build green.',
    () => 'Build broken.',
    () => 'Will follow up.',
    () => 'Got it.',
    () => 'Will do.',
    () => 'Sounds good.',
    () => 'Worth a look.',
    () => 'Looking into it.',
    () => 'Pending review.',
    () => 'Cancelled.',
    () => 'Scheduled.',
    () => 'Heads up.',
    (r) => `${pick(BANK.verbPast, r)}.`,
    (r) => `${pick(BANK.verbPast, r)} the ${pick(BANK.artifact, r)}.`,
    (r) => `Will ${pick(BANK.verbActive, r)} ${pick(BANK.timeShort, r)}.`,
    (r) => `${pick(BANK.adjective, r)} ${pick(BANK.problem, r)}.`,
    (r) => `Need to ${pick(BANK.verbActive, r)}.`
  ],
  '6-10': [
    (r) =>
      `${pick(BANK.subject, r)} ${pick(BANK.verbPast, r)} the ${pick(BANK.artifact, r)} ${pick(BANK.timeShort, r)}.`,
    (r) =>
      `${pick(BANK.subject, r)} ${pick(BANK.verbSay, r)} the ${pick(BANK.problem, r)} ${pick(BANK.time, r)}.`,
    (r) =>
      `${pick(BANK.qualifier, r)}, ${pick(BANK.subjectLower, r)} should ${pick(BANK.verbActive, r)} the ${pick(BANK.artifact, r)}.`,
    (r) =>
      `The ${pick(BANK.artifact, r)} needs a ${pick(BANK.adjective, r)} pass ${pick(BANK.time, r)}.`,
    (r) => `Worth flagging the ${pick(BANK.problem, r)} in the ${pick(BANK.artifact, r)}.`,
    (r) => `Heads up on ${pick(BANK.topic, r)} ${pick(BANK.time, r)}.`,
    (r) =>
      `${pick(BANK.subject, r)} will ${pick(BANK.verbActive, r)} the ${pick(BANK.artifact, r)} after standup.`,
    (r) => `Quick note on the ${pick(BANK.artifact, r)} for ${pick(BANK.topic, r)}.`,
    (r) =>
      `${pick(BANK.subject, r)} ${pick(BANK.verbPast, r)} a ${pick(BANK.adjective, r)} fix ${pick(BANK.time, r)}.`,
    (r) => `Will ${pick(BANK.verbActive, r)} ${pick(BANK.topic, r)} before the review.`,
    (r) => `${pick(BANK.subject, r)} owns the ${pick(BANK.artifact, r)} rollout this sprint.`,
    (r) => `Pause on ${pick(BANK.topic, r)} until ${pick(BANK.reason, r)} clears.`
  ],
  '11-15': [
    (r) =>
      `${pick(BANK.subject, r)} suggests we ${pick(BANK.verbActive, r)} the ${pick(BANK.artifact, r)} ${pick(BANK.time, r)} given ${pick(BANK.reason, r)}.`,
    (r) =>
      `The ${pick(BANK.artifact, r)} migration plan looks reasonable, modulo ${pick(BANK.reason, r)} and the rollout window.`,
    (r) =>
      `My read is that ${pick(BANK.subjectLower, r)} should ${pick(BANK.verbActive, r)} the ${pick(BANK.artifact, r)} cautiously ${pick(BANK.time, r)}.`,
    (r) =>
      `Two thoughts on ${pick(BANK.topic, r)}: first the dependency chain, then the rollout cadence.`,
    (r) =>
      `Worth surfacing that ${pick(BANK.topic, r)} will slip unless ${pick(BANK.subjectLower, r)} prioritises it ${pick(BANK.time, r)}.`,
    (r) =>
      `${pick(BANK.qualifier, r)}, the ${pick(BANK.adjective, r)} approach to ${pick(BANK.topic, r)} is the right one ${pick(BANK.time, r)}.`,
    (r) =>
      `${pick(BANK.subject, r)} ${pick(BANK.verbSay, r)} the ${pick(BANK.problem, r)} which means ${pick(BANK.reason, r)} needs revisiting.`,
    (r) =>
      `Worth scoping the ${pick(BANK.artifact, r)} into a ${pick(BANK.adjective, r)} delivery before ${pick(BANK.topic, r)} ships.`
  ],
  '16-20': [
    (r) =>
      `My recommendation is that ${pick(BANK.subjectLower, r)} should ${pick(BANK.verbActive, r)} the ${pick(BANK.artifact, r)} ${pick(BANK.time, r)}, conditional on ${pick(BANK.reason, r)} being resolved beforehand.`,
    (r) =>
      `The risk profile of the ${pick(BANK.artifact, r)} rollout depends on ${pick(BANK.reason, r)}, and ${pick(BANK.subjectLower, r)} should probably pause until ${pick(BANK.topic, r)} is settled.`,
    (r) =>
      `Comparing this quarter to the last, the trend on ${pick(BANK.topic, r)} is clearly accelerating which suggests ${pick(BANK.subjectLower, r)} should act ${pick(BANK.time, r)}.`,
    (r) =>
      `${pick(BANK.qualifier, r)}, the cleaner option for ${pick(BANK.topic, r)} is the one ${pick(BANK.subjectLower, r)} discounted last week, which deserves another look ${pick(BANK.time, r)}.`,
    (r) =>
      `Worth flagging the ${pick(BANK.problem, r)} in the ${pick(BANK.artifact, r)} — it ties back to ${pick(BANK.reason, r)} and needs sorting ${pick(BANK.time, r)}.`,
    (r) =>
      `${pick(BANK.subject, r)} ${pick(BANK.verbSay, r)} the ${pick(BANK.problem, r)} in standup and the ${pick(BANK.adjective, r)} response is to revisit ${pick(BANK.topic, r)} ${pick(BANK.time, r)}.`
  ],
  '21-25': [
    (r) =>
      `Trade-off worth naming explicitly: shipping the ${pick(BANK.artifact, r)} ${pick(BANK.time, r)} costs us ${pick(BANK.reason, r)}, but waiting another sprint risks losing momentum on ${pick(BANK.topic, r)}.`,
    (r) =>
      `My instinct is to ${pick(BANK.verbActive, r)} a smaller version of the ${pick(BANK.artifact, r)} first, then revisit ${pick(BANK.time, r)} once we have feedback on ${pick(BANK.topic, r)} from the team.`,
    (r) =>
      `The ${pick(BANK.adjective, r)} answer on ${pick(BANK.topic, r)} is probably yes, but ${pick(BANK.subjectLower, r)} should sanity-check the data and confirm ${pick(BANK.reason, r)} is not still blocking ${pick(BANK.time, r)}.`,
    (r) =>
      `${pick(BANK.subject, r)} ${pick(BANK.verbSay, r)} the ${pick(BANK.problem, r)} in standup, and I think the ${pick(BANK.adjective, r)} response is to pause the ${pick(BANK.artifact, r)} until ${pick(BANK.topic, r)} is clarified.`,
    (r) =>
      `Looking at the dependency chain, ${pick(BANK.subjectLower, r)} should ${pick(BANK.verbActive, r)} the ${pick(BANK.artifact, r)} ${pick(BANK.time, r)} but only after ${pick(BANK.reason, r)} has been worked through with the broader group.`
  ],
  '25+': [
    (r) =>
      `Stepping back from the implementation details for a moment, the broader question is whether ${pick(BANK.subjectLower, r)} should ${pick(BANK.verbActive, r)} the ${pick(BANK.artifact, r)} ${pick(BANK.time, r)}, accepting ${pick(BANK.reason, r)} as the cost, or wait until ${pick(BANK.topic, r)} surfaces any blockers that would otherwise compound across the rollout window.`,
    (r) =>
      `The dependency graph of the ${pick(BANK.artifact, r)} is more tangled than expected when ${pick(BANK.subjectLower, r)} drafted the proposal earlier this quarter, and unwinding it cleanly without breaking downstream consumers will probably need a dedicated sprint that I would suggest scheduling ${pick(BANK.time, r)}.`,
    (r) =>
      `Worth pausing here to capture the full reasoning: the ${pick(BANK.artifact, r)} rollout interacts with ${pick(BANK.topic, r)} in a way that is not obvious from the spec, and ${pick(BANK.reason, r)} compounds that, so ${pick(BANK.subjectLower, r)} should probably revisit the sequencing ${pick(BANK.time, r)}.`,
    (r) =>
      `Reflecting on the standup conversation about ${pick(BANK.topic, r)}, I think the ${pick(BANK.adjective, r)} path is to ${pick(BANK.verbActive, r)} the ${pick(BANK.artifact, r)} ${pick(BANK.time, r)}, file the open questions back to ${pick(BANK.subjectLower, r)}, and revisit once ${pick(BANK.reason, r)} has been worked through end to end.`
  ]
}

function pickBucket(rng: () => number): BucketSpec {
  const r = rng()
  let acc = 0
  for (const b of BUCKET_SPECS) {
    acc += b.share
    if (r < acc) return b
  }
  return BUCKET_SPECS[BUCKET_SPECS.length - 1] as BucketSpec
}

function generateClause(bucket: BucketSpec, rng: () => number): string {
  const templates = TEMPLATES[bucket.label]
  const t = templates[Math.floor(rng() * templates.length)] as Template
  return t(rng)
}

// =========================================================================
// Modes
// =========================================================================
//
// Mode tone via specialised pools is gone — the bucket-driven generator
// produces every clause now — but modes still control the *shape* of each
// recording: clause count, WPM mean, and overall share. The mode-share
// donut and the WPM-by-time chart stay driven by these.

interface ModeSpec {
  name: string
  share: number
  wpmMean: number
  wpmSd: number
  clausesMean: number
  clausesSd: number
}

const MODES: ModeSpec[] = [
  { name: 'Default', share: 0.5, wpmMean: 125, wpmSd: 12, clausesMean: 10, clausesSd: 4 },
  { name: 'Email', share: 0.22, wpmMean: 138, wpmSd: 10, clausesMean: 11, clausesSd: 4 },
  { name: 'Coding', share: 0.18, wpmMean: 108, wpmSd: 12, clausesMean: 6, clausesSd: 3 },
  { name: 'Meeting', share: 0.1, wpmMean: 132, wpmSd: 8, clausesMean: 24, clausesSd: 6 }
]

// =========================================================================
// Helpers
// =========================================================================

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

/**
 * Sprinkle filler phrases into a transcript at roughly `rate` per word.
 */
function injectFillers(text: string, rate: number, rng: () => number): string {
  const fillers = DEFAULT_FILLER_PHRASES.filter((f) => f.length <= 6)
  if (fillers.length === 0) return text
  const words = text.split(/(\s+)/)
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

// =========================================================================
// Top-level builder
// =========================================================================

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
    const dow = date.getDay()

    const activeProb = dow === 0 || dow === 6 ? 0.35 : 0.92
    if (rng() > activeProb) continue

    const meanCount = dow === 0 || dow === 6 ? 4 : 12
    const count = Math.max(1, Math.round(gaussian(rng, meanCount, meanCount * 0.4)))

    for (let i = 0; i < count; i++) {
      const mode = pickMode(rng)
      const hour = Math.max(6, Math.min(22, Math.round(gaussian(rng, 13, 3))))
      const minute = Math.floor(rng() * 60)
      const second = Math.floor(rng() * 60)
      const recTime = new Date(date)
      recTime.setHours(hour, minute, second, 0)

      // Pick a target sentence-length bucket independently of mode so the
      // global Sentence-length chart matches BUCKET_SPECS. Stitch
      // `clauseCount` sentences from that bucket's templates.
      const bucket = pickBucket(rng)
      const clauseCount = Math.max(1, Math.round(gaussian(rng, mode.clausesMean, mode.clausesSd)))
      const clauses: string[] = []
      for (let c = 0; c < clauseCount; c++) clauses.push(generateClause(bucket, rng))
      const baseText = clauses.join(' ')
      const result = injectFillers(baseText, FILLER_RATE, rng)

      const words = rawWordCount(result)
      const sents = sentenceCount(result)

      const wpm = Math.max(60, Math.round(gaussian(rng, mode.wpmMean, mode.wpmSd)))
      const durationSec = Math.max(2, Math.round((words / wpm) * 60))
      const durationMs = durationSec * 1000

      const fillers = buildFillers(result, fillerPhrases)

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
