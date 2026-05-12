import { describe, expect, it } from 'vitest'
import { buildFillers, normalisePhrases, tokenise } from './text-metrics'

describe('tokenise', () => {
  it('lowercases, strips punctuation, drops stop-words', () => {
    const tokens = tokenise('The Quick brown Fox, and the lazy dog!')
    // 'the' / 'and' are stop-words; everything else stays.
    expect(tokens).toEqual(['quick', 'brown', 'fox', 'lazy', 'dog'])
  })

  it('drops tokens shorter than 3 characters', () => {
    const tokens = tokenise('a be cat dogs')
    expect(tokens).toEqual(['cat', 'dogs'])
  })

  it('returns an empty array for empty / whitespace input', () => {
    expect(tokenise('')).toEqual([])
    expect(tokenise('   \n\t  ')).toEqual([])
  })
})

describe('normalisePhrases', () => {
  it('lowercases, trims, collapses internal whitespace', () => {
    expect(normalisePhrases([' YOU   know ', 'Like'])).toEqual(['you know', 'like'])
  })

  it('drops empties and non-strings, deduplicates case-insensitively', () => {
    const out = normalisePhrases(['um', 'UM', '', '   ', 'like', 42, null, 'Like'])
    expect(out).toEqual(['um', 'like'])
  })

  it('preserves first-seen order', () => {
    expect(normalisePhrases(['like', 'um', 'so', 'like'])).toEqual(['like', 'um', 'so'])
  })
})

describe('buildFillers', () => {
  it('counts whole-word matches, case-insensitive', () => {
    const out = buildFillers('Um, well, that was um, like, fine.', ['um', 'like', 'well'])
    expect(out.count).toBe(4)
    const lookup = Object.fromEntries(out.breakdown.map((b) => [b.phrase, b.count]))
    expect(lookup.um).toBe(2)
    expect(lookup.like).toBe(1)
    expect(lookup.well).toBe(1)
  })

  it('does not match substrings ("umbrella" does not trip "um")', () => {
    const out = buildFillers('I bought an umbrella for the rain.', ['um'])
    expect(out.count).toBe(0)
    expect(out.breakdown).toEqual([])
  })

  it('matches multi-word phrases as a unit and tolerates extra whitespace', () => {
    const out = buildFillers('Yeah you   know it was, you know, fine.', ['you know'])
    expect(out.count).toBe(2)
    expect(out.breakdown[0]).toEqual({ phrase: 'you know', count: 2 })
  })

  it('breakdown counts sum to total', () => {
    const out = buildFillers('um like um you know like', ['um', 'like', 'you know'])
    const sum = out.breakdown.reduce((s, b) => s + b.count, 0)
    expect(sum).toBe(out.count)
  })

  it('breakdown is sorted descending by count', () => {
    const out = buildFillers('um um um like like so', ['um', 'like', 'so'])
    expect(out.breakdown.map((b) => b.phrase)).toEqual(['um', 'like', 'so'])
  })
})
