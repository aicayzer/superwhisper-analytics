/**
 * Default filler-phrase categories used by Settings → Analysis →
 * Filler dictionary. Categories are a renderer-side grouping over the
 * flat `fillerWords` config — the persisted format stays as a flat
 * `string[]`, but the UI displays them grouped so the user can scan,
 * toggle, and edit cohesive groups rather than 170+ chips.
 *
 * Names are deliberately plain-English: "Emphasis words", not
 * "Intensifiers"; "Conversational fillers", not "Discourse markers".
 *
 * `DEFAULT_FILLER_PHRASES` (in `text-metrics.ts`) is derived from this
 * — one source of truth for what phrases count by default.
 */

export interface FillerCategory {
  /** Stable kebab-case slug used as a React key and for category-state
   *  persistence if/when we add it. */
  id: string
  /** Plain-English title shown in the UI. */
  label: string
  /** One-line description for the row subtitle. */
  description: string
  /** Phrases that fall under this category. Order is curated. */
  phrases: readonly string[]
}

export const DEFAULT_FILLER_CATEGORIES: readonly FillerCategory[] = [
  {
    id: 'hesitations',
    label: 'Hesitations',
    description: 'Sounds people make while thinking — um, uh, hmm.',
    phrases: [
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
      'huh'
    ]
  },
  {
    id: 'conversational-fillers',
    label: 'Conversational fillers',
    description:
      'Little phrases that pad speech without adding meaning — like, you know, the thing is.',
    phrases: [
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
      'like I said',
      'as I said'
    ]
  },
  {
    id: 'softeners',
    label: 'Softeners',
    description:
      "Phrases that hedge or downplay what you're saying — kind of, sort of, a little bit.",
    phrases: [
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
      'sort of a',
      'kind of a',
      'a bit of a',
      'a little bit',
      'a sort of',
      'a kind of',
      'as it were',
      'so to speak'
    ]
  },
  {
    id: 'emphasis-words',
    label: 'Emphasis words',
    description:
      'Words that amplify a point but rarely add meaning — literally, actually, totally.',
    phrases: [
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
      'really really'
    ]
  },
  {
    id: 'uncertainty-corrections',
    label: 'Uncertainty and corrections',
    description: 'Hedging your opinion or rephrasing mid-thought — I think, maybe, or rather.',
    phrases: [
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
      'or rather',
      'or actually',
      'I should say',
      'I mean to say',
      'scratch that',
      'not really',
      'not necessarily',
      'no I mean',
      'I dunno',
      'I don’t know'
    ]
  },
  {
    id: 'vague-references',
    label: 'Vague references',
    description: 'Generic stand-ins and trailing closers — thing, stuff, or something, and so on.',
    phrases: [
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
      'and things'
    ]
  }
] as const

/** Flat default list — derived from the categories above. Order matches
 *  the category traversal so existing callers see the same phrases in
 *  roughly the same order as before. */
export const DEFAULT_FILLER_PHRASES_FROM_CATEGORIES: readonly string[] =
  DEFAULT_FILLER_CATEGORIES.flatMap((c) => c.phrases)
