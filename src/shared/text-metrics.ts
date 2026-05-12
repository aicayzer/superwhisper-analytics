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
 *
 * The list spans the usual linguistic categories — interjections,
 * discourse markers, hedges, vague intensifiers, epistemic phrases,
 * vague references, closers, and common filler clauses. Users can prune
 * what doesn't suit them from Settings → Dictionary; the canonical list
 * is intentionally generous so the analytics catch most candidates.
 */
export const DEFAULT_FILLER_PHRASES: readonly string[] = [
  // Pure hesitations / interjections
  'um',
  'umm',
  'uhm',
  'uh',
  'uhh',
  'uhhh',
  'er',
  'err',
  'errr',
  'erm',
  'ehm',
  'errm',
  'errrm',
  'ah',
  'ahh',
  'ahem',
  'eh',
  'hmm',
  'mhm',
  'mhmm',
  'mm',
  'mmm',
  'nnn',
  'oh',
  'ohh',
  'oof',
  'phew',
  'psst',
  'tsk',
  'duh',
  'pfft',
  'huh',
  // Discourse markers
  'like',
  'you know',
  'I mean',
  'so',
  'well',
  'right',
  'okay',
  'alright',
  'anyway',
  'anyhow',
  'now',
  'you see',
  'see',
  'look',
  'listen',
  'so yeah',
  'yeah so',
  'and yeah',
  'right so',
  'so basically',
  'I mean yeah',
  'yeah no',
  'no but',
  'so anyway',
  'so look',
  // Hedges
  'kind of',
  'sort of',
  'kinda',
  'sorta',
  'basically',
  'essentially',
  'more or less',
  'in a way',
  'in a sense',
  'in some way',
  'somewhat',
  'roughly',
  'approximately',
  'sort of like',
  'kind of like',
  'type of thing',
  'type thing',
  // Vague intensifiers
  'actually',
  'literally',
  'definitely',
  'totally',
  'obviously',
  'clearly',
  'honestly',
  'frankly',
  'really',
  'just',
  'pretty much',
  'absolutely',
  'completely',
  'entirely',
  'thoroughly',
  'super',
  'genuinely',
  'truly',
  'really really',
  // Epistemic / opinion
  'I guess',
  'I suppose',
  'I think',
  'I would say',
  "I'd say",
  'it seems',
  "it's like",
  'you could say',
  'I would think',
  'I just',
  'I feel like',
  'maybe',
  'probably',
  'arguably',
  'I think so',
  'who knows',
  // Vague references
  'thing',
  'stuff',
  'whatever',
  'something',
  'anything',
  'somehow',
  'that thing',
  'this thing',
  'those things',
  'these things',
  'all that stuff',
  'all that',
  'stuff like that',
  'things like that',
  'something like that',
  // Closers
  'or something',
  'or whatever',
  'or anything',
  'or so',
  'or thereabouts',
  'or such',
  'or whatnot',
  'and so on',
  'and so forth',
  'et cetera',
  'etcetera',
  'and what have you',
  'and whatnot',
  'and stuff',
  'and things',
  // Filler clauses
  'you know what I mean',
  'do you know what I mean',
  'you see what I mean',
  'if that makes sense',
  'does that make sense',
  'what I mean is',
  'the thing is',
  'the fact is',
  'the point is',
  'the way I see it',
  'if you ask me',
  'in my opinion',
  // Self-corrections
  'or rather',
  'or actually',
  'I should say',
  'I mean to say',
  'scratch that',
  // Negations / push-backs
  'not really',
  'not necessarily',
  'no I mean',
  // Other common
  'like I said',
  'as I said',
  'sort of a',
  'kind of a',
  'a bit of a',
  'a little bit',
  'a sort of',
  'a kind of',
  'as it were',
  'so to speak',
  'I dunno',
  'I don’t know'
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
