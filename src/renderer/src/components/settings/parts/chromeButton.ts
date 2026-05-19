/**
 * Shared button-class strings used by Settings cards. Promoted out of
 * `screens/Settings.tsx` so the redesigned cards (each in its own file)
 * can reuse the same visual treatment without re-deriving.
 *
 * The chrome here is intentionally restrained — small, neutral, with the
 * border + floating bg pattern that runs through the rest of the app.
 * Hover state lifts the surface to `foreground/5`.
 *
 * Three variants:
 *
 *   • `CHROME_BUTTON`         — default ghost-bordered chrome button.
 *   • `CHROME_BUTTON_PRIMARY` — black fill / white foreground; used
 *                               sparingly for the primary "Sync" action.
 *   • `CHROME_BUTTON_WARN`    — accent-orange tint, used by destructive
 *                               actions (Reset…). Reads as "be careful"
 *                               rather than red-alarm "destructive".
 */
export const CHROME_BUTTON =
  'inline-flex h-7 items-center gap-1.5 rounded-md border border-border bg-floating px-3 text-[12px] text-foreground transition-colors hover:bg-foreground/5 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-floating'

export const CHROME_BUTTON_PRIMARY =
  'inline-flex h-7 items-center gap-1.5 rounded-md border border-foreground bg-foreground px-3 text-[12px] font-medium text-background transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-60'

export const CHROME_BUTTON_WARN =
  'inline-flex h-7 items-center gap-1.5 rounded-md border border-accent-orange/40 bg-accent-orange/10 px-3 text-[12px] font-medium text-accent-orange transition-colors hover:bg-accent-orange/15 disabled:cursor-not-allowed disabled:opacity-50'
