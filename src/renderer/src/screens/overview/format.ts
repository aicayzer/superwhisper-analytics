/** Format X-axis date ticks for activity charts. */
export function formatActivityTick(raw: unknown): string {
  const d = new Date(String(raw))
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}
