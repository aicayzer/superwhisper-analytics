import { useThemeStore } from '@renderer/state/themeStore'
import { useEffect, useState } from 'react'
import { Toaster as SonnerToaster } from 'sonner'

/**
 * Sonner-backed toast container. Mount once at the app root. Toast
 * call-sites must use the `toastError` / `toastInfo` / `toastSuccess`
 * helpers in `@renderer/lib/toast` — direct imports from `sonner`
 * outside this file (and the wrapper module) are blocked by ESLint.
 *
 * Visual rhythm: failures lean on the destructive token (red text +
 * red-tinted surface), successes on accent-green. Padding is tighter
 * than sonner's defaults so the toast reads as one calm line rather
 * than a slab. Action buttons are outlined (not the bright
 * black-on-white "primary" face) so they don't compete with the toast
 * body for attention.
 *
 * Theming: derives `'light' | 'dark'` from the app's ThemePref + the
 * OS media query so the toast surface tracks the rest of the chrome.
 * `pref === 'system'` listens live and re-renders on appearance flip.
 */
export function Toaster(): React.JSX.Element {
  const pref = useThemeStore((s) => s.pref)
  const [systemDark, setSystemDark] = useState<boolean>(() => prefersDark())

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (): void => setSystemDark(mq.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const isDark = pref === 'dark' || (pref === 'system' && systemDark)

  return (
    <SonnerToaster
      position="bottom-center"
      theme={isDark ? 'dark' : 'light'}
      offset={16}
      gap={8}
      toastOptions={{
        // Base toast — tighter vertical padding than sonner's default
        // 16px so it reads as a calm pill rather than a card slab.
        classNames: {
          toast:
            'rounded-lg border border-border bg-card text-card-foreground shadow-sm text-[12.5px] font-normal !py-2 !px-3',
          title: 'text-[12.5px] font-medium leading-snug',
          description: 'text-[12px] text-muted-foreground leading-snug',
          // Outlined action button — quieter than the previous black
          // chrome so "Copy logs" doesn't out-shout the toast itself.
          actionButton:
            '!rounded-md !border !border-border !bg-card !text-foreground !text-[11.5px] !font-medium !px-2 !py-0.5 hover:!bg-foreground/5',
          cancelButton: '!rounded-md !text-[11.5px] !text-muted-foreground !px-2 !py-0.5',
          // Failure — destructive red text on a faint red-tinted surface.
          // Using rgba so we don't need a new --destructive-bg token.
          error:
            '!border-destructive/40 !text-destructive [&]:bg-[color:color-mix(in_srgb,var(--destructive)_10%,var(--card))]',
          // Success — green text on a faint green-tinted surface,
          // mirrored from the destructive treatment.
          success:
            '!border-accent-green/40 !text-accent-green [&]:bg-[color:color-mix(in_srgb,var(--accent-green)_10%,var(--card))]'
        }
      }}
    />
  )
}

function prefersDark(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
