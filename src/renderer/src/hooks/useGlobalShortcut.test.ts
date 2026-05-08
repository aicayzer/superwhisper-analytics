import { describe, expect, it } from 'vitest'
import { matchesShortcut } from './useGlobalShortcut'

function event(opts: {
  key: string
  meta?: boolean
  ctrl?: boolean
  shift?: boolean
  alt?: boolean
}): {
  key: string
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
} {
  return {
    key: opts.key,
    metaKey: Boolean(opts.meta),
    ctrlKey: Boolean(opts.ctrl),
    shiftKey: Boolean(opts.shift),
    altKey: Boolean(opts.alt)
  }
}

describe('matchesShortcut', () => {
  it('matches CMD+K on macOS', () => {
    expect(matchesShortcut(event({ key: 'k', meta: true }), { key: 'k', mod: true })).toBe(true)
  })

  it('matches CTRL+K on other platforms', () => {
    expect(matchesShortcut(event({ key: 'k', ctrl: true }), { key: 'k', mod: true })).toBe(true)
  })

  it('does not match plain k when mod required', () => {
    expect(matchesShortcut(event({ key: 'k' }), { key: 'k', mod: true })).toBe(false)
  })

  it('does not match CMD+K when no mod expected', () => {
    expect(matchesShortcut(event({ key: 'k', meta: true }), { key: 'k' })).toBe(false)
  })

  it('matches Escape with no modifiers', () => {
    expect(matchesShortcut(event({ key: 'Escape' }), { key: 'escape' })).toBe(true)
  })

  it('is case-insensitive on the key', () => {
    expect(matchesShortcut(event({ key: 'K', meta: true }), { key: 'k', mod: true })).toBe(true)
  })

  it('requires shift when specified', () => {
    expect(
      matchesShortcut(event({ key: 'p', meta: true, shift: true }), {
        key: 'p',
        mod: true,
        shift: true
      })
    ).toBe(true)
    expect(
      matchesShortcut(event({ key: 'p', meta: true }), { key: 'p', mod: true, shift: true })
    ).toBe(false)
  })

  it('rejects shift if not specified', () => {
    expect(
      matchesShortcut(event({ key: 'k', meta: true, shift: true }), { key: 'k', mod: true })
    ).toBe(false)
  })
})
