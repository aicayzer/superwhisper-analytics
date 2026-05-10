/**
 * Text utilities shared between main and renderer.
 *
 * Main scanner uses these to derive per-recording word counts, filler
 * counts, and the global word-frequency map. Renderer uses them in
 * `WordsCard` (the per-recording most-common-words list) and the
 * transcript word-hover highlight.
 *
 * Pure functions — no React, DOM, or Electron deps. Importable from
 * any process the build pipeline can resolve `@shared/*`.
 */

export const STOP_WORDS = new Set([
  'the',
  'and',
  'a',
  'an',
  'of',
  'to',
  'in',
  'is',
  'it',
  'that',
  'i',
  'for',
  'on',
  'with',
  'as',
  'this',
  'be',
  'are',
  'was',
  'or',
  'at',
  'by',
  'we',
  'you',
  'he',
  'she',
  'they',
  'but',
  'not',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'so',
  'if',
  'just',
  'my',
  'me',
  'your',
  'our',
  'their',
  'his',
  'her',
  'its',
  'them',
  'will',
  'would',
  'could',
  'should',
  'about',
  'from',
  'into',
  'over',
  'after',
  'before',
  'than',
  'some',
  'any',
  'no',
  'how',
  'what',
  'when',
  'where',
  'who',
  'why',
  'all',
  'one',
  'two',
  'be',
  'been',
  'being',
  'am',
  'were',
  'because',
  'while',
  'also',
  'only',
  'very',
  'can',
  'cant',
  'dont',
  'im',
  'thats',
  'whats',
  'theres',
  'its',
  'ive',
  'youre',
  'were',
  'theyre',
  's',
  't',
  'd',
  'll',
  've',
  're',
  'm'
])

/** Lowercase, strip punctuation, drop stop-words and tokens shorter than 3 chars. */
export function tokenise(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z'\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.replace(/^'+|'+$/g, ''))
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

/**
 * Default conversational filler phrases. Used as the seed value when a
 * config has no `fillerWords` field yet, and as the "Reset to default"
 * target in Settings → Dictionary. Multi-word phrases match
 * whitespace-flexibly so "you   know" and "you know" both count.
 */
export const DEFAULT_FILLER_PHRASES: readonly string[] = [
  'um',
  'uh',
  'like',
  'you know',
  'I mean',
  'so',
  'right',
  'kind of',
  'sort of',
  'basically',
  'actually'
] as const

export interface FillerSummary {
  count: number
  breakdown: Array<{ phrase: string; count: number }>
}

/**
 * Count filler-phrase occurrences in a transcript. Case-insensitive.
 * The leading + trailing space wraps the regex so word-boundary checks
 * work at the very start/end of the text.
 *
 * `phrases` defaults to `DEFAULT_FILLER_PHRASES`; callers in main pass the
 * user's configured list (Settings → Dictionary) so the analytics reflect
 * what the user counts as a filler today.
 */
export function buildFillers(
  text: string,
  phrases: readonly string[] = DEFAULT_FILLER_PHRASES
): FillerSummary {
  const lower = ` ${text.toLowerCase()} `
  const counts = new Map<string, number>()
  let total = 0
  for (const phrase of phrases) {
    if (!phrase) continue
    // Allow flexible whitespace inside phrases, and escape regex metas.
    const cleaned = phrase.toLowerCase().trim()
    if (!cleaned) continue
    const escaped = cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')
    const matches = lower.match(new RegExp(`(?<=\\W)${escaped}(?=\\W)`, 'g'))
    if (matches && matches.length > 0) {
      counts.set(cleaned, (counts.get(cleaned) ?? 0) + matches.length)
      total += matches.length
    }
  }
  return {
    count: total,
    breakdown: Array.from(counts.entries())
      .map(([phrase, count]) => ({ phrase, count }))
      .sort((a, b) => b.count - a.count)
  }
}

/**
 * Normalise a user-supplied phrase list: trim, lowercase, collapse
 * internal whitespace, drop empties + duplicates. Used by the renderer
 * when writing back to config + by main when reading from config.
 */
export function normalisePhrases(phrases: readonly unknown[]): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of phrases) {
    if (typeof raw !== 'string') continue
    const cleaned = raw.trim().toLowerCase().replace(/\s+/g, ' ')
    if (!cleaned) continue
    if (seen.has(cleaned)) continue
    seen.add(cleaned)
    out.push(cleaned)
  }
  return out
}
