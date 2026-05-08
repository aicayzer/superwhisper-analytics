import { useEffect } from 'react'

export interface ShortcutDefinition {
  /** The key.toLowerCase() match — e.g. 'k', 'escape', '/'. */
  key: string
  /** Require the cross-platform mod key (Cmd on macOS, Ctrl elsewhere). */
  mod?: boolean
  shift?: boolean
  alt?: boolean
}

/**
 * Structurally typed so unit tests can pass plain objects instead of
 * constructing real KeyboardEvent instances.
 */
interface KeyboardEventLike {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
}

/**
 * Pure helper. True when the keyboard event matches the shortcut definition.
 *
 * `mod: true` matches metaKey OR ctrlKey, so the same shortcut works on
 * macOS (Cmd) and other platforms (Ctrl) without conditional registration.
 */
export function matchesShortcut(e: KeyboardEventLike, def: ShortcutDefinition): boolean {
  if (e.key.toLowerCase() !== def.key.toLowerCase()) return false
  const mod = Boolean(e.metaKey || e.ctrlKey)
  if (Boolean(def.mod) !== mod) return false
  if (Boolean(def.shift) !== Boolean(e.shiftKey)) return false
  if (Boolean(def.alt) !== Boolean(e.altKey)) return false
  return true
}

/**
 * Registers a global keyboard shortcut on `window`. The handler fires when
 * the shortcut matches; preventDefault is called automatically.
 *
 * Listener re-binds when the shortcut shape or handler identity changes.
 * Pass a stable handler (e.g. a Zustand selector) to avoid unnecessary
 * re-binding.
 */
export function useGlobalShortcut(def: ShortcutDefinition, handler: () => void): void {
  const { key, mod, shift, alt } = def

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (matchesShortcut(e, { key, mod, shift, alt })) {
        e.preventDefault()
        handler()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, mod, shift, alt, handler])
}
