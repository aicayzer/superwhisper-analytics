import { toast as sonnerToast } from 'sonner'

/**
 * Single entry point for toast notifications. Wraps sonner so the rest
 * of the app never imports from 'sonner' directly — that boundary is
 * enforced by ESLint's `no-restricted-imports` rule (see eslint.config.mjs).
 *
 * When to reach for a toast:
 *
 *   • toastError — genuine errors the user can't recover from inline.
 *     Background sync failures, unexpected API rejections, OAuth
 *     refresh blowing up. Pair with `copyText` whenever the user
 *     might need to share details with us.
 *
 *   • toastInfo — sparingly, for transient confirmations that *don't*
 *     have an inline home. The Developer tab's "Purged X recordings"
 *     line is a fair example; routine sign-in / sync success is not
 *     (the card itself carries that signal).
 *
 * When NOT to reach for a toast:
 *
 *   • Never duplicate an inline error state. If the ConnectionCard
 *     already renders "Last sync failed — <reason>" with a Retry
 *     button, the toast is at most an *additional* one-shot signal on
 *     the transition. Don't pile up.
 *
 *   • Never on every render. Trigger on state-change transitions only
 *     (keyed `useEffect` watching the error string). Otherwise the
 *     same toast loops every re-render.
 *
 *   • Never for routine success paths that are visible elsewhere.
 *     Sign-in success and sync completion both transition the card —
 *     no toast needed.
 */

export interface ToastErrorInput {
  /** Headline shown in the toast body. Keep it short and human. */
  message: string
  /**
   * Optional log payload offered behind a Copy button. Use whenever
   * the user might need to share the error with us — full stack
   * trace, response body, request ID, etc.
   */
  copyText?: string
}

export interface ToastInfoInput {
  /** Headline shown in the toast body. Keep it short and human. */
  message: string
}

export function toastError({ message, copyText }: ToastErrorInput): void {
  if (copyText) {
    sonnerToast.error(message, {
      duration: 8_000,
      action: {
        label: 'Copy logs',
        onClick: () => {
          void copyToClipboard(copyText)
        }
      }
    })
    return
  }
  sonnerToast.error(message, { duration: 6_000 })
}

export function toastInfo({ message }: ToastInfoInput): void {
  sonnerToast(message, { duration: 4_000 })
}

/**
 * Explicit positive confirmation. Use when the success isn't otherwise
 * visible (e.g. a background completion the user triggered but isn't
 * watching). Renders with the green success tint from `sonner.tsx`.
 */
export function toastSuccess({ message }: ToastInfoInput): void {
  sonnerToast.success(message, { duration: 3_000 })
}

async function copyToClipboard(value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value)
    sonnerToast.success('Copied', { duration: 1_500 })
  } catch (err) {
    // Fall back to a follow-up toast — the user can read the value
    // from console if needed. Don't dump it into the original toast.
    console.warn('[toast] clipboard write failed:', err)
    sonnerToast.error('Copy failed — see console.', { duration: 3_000 })
  }
}
