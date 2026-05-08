interface PlaceholderProps {
  name: string
}

/**
 * Stand-in for screens that arrive in later waves (Usage, Language,
 * Settings). Keeps routing wired so the sidebar links go somewhere
 * without us building real content yet.
 */
export function Placeholder({ name }: PlaceholderProps): React.JSX.Element {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 p-12 text-center">
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        Wave 2
      </div>
      <div className="text-xl font-semibold tracking-tight text-foreground">{name}</div>
      <p className="max-w-md text-[13px] leading-relaxed text-muted-foreground">
        Coming once Overview, Transcripts, and the data layer settle. The route is wired so the
        navigation stays predictable while the UI is still being shaped.
      </p>
    </div>
  )
}
