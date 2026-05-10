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
 * Common conversational filler phrases. Multi-word phrases match
 * whitespace-flexibly so "you   know" and "you know" both count.
 */
export const FILLER_PHRASES = [
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
 */
export function buildFillers(text: string): FillerSummary {
  const lower = ` ${text.toLowerCase()} `
  const counts = new Map<string, number>()
  let total = 0
  for (const phrase of FILLER_PHRASES) {
    const escaped = phrase.replace(/ /g, '\\s+')
    const matches = lower.match(new RegExp(`(?<=\\W)${escaped}(?=\\W)`, 'g'))
    if (matches && matches.length > 0) {
      counts.set(phrase, matches.length)
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
