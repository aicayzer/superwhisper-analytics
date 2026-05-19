/**
 * Small formatting helpers used across screens. UK English defaults.
 */

export function formatDurationSec(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  if (s < 60) return `${s}s`
  const m = Math.floor(s / 60)
  if (m < 60) {
    const rem = s - m * 60
    return rem === 0 ? `${m}m` : `${m}m ${rem}s`
  }
  const h = Math.floor(m / 60)
  const remM = m - h * 60
  return remM === 0 ? `${h}h` : `${h}h ${remM}m`
}

export function formatDurationMs(ms: number): string {
  return formatDurationSec(ms / 1000)
}

/**
 * Concise time display for audio scrubber: M:SS / mm:ss.
 */
export function formatClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds))
  const m = Math.floor(s / 60)
  const r = s - m * 60
  return `${m}:${r.toString().padStart(2, '0')}`
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-GB')
}

/**
 * Compact thousands: 4.2k, 946.7k, 1.2M.
 */
export function formatCompact(n: number): string {
  if (n < 1000) return String(n)
  if (n < 1_000_000) {
    const k = n / 1000
    return `${k >= 100 ? Math.round(k) : k.toFixed(1)}k`
  }
  const m = n / 1_000_000
  return `${m >= 100 ? Math.round(m) : m.toFixed(1)}M`
}

export function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

export function formatDateOnly(iso: string): string {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function truncate(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, Math.max(0, max - 1)).trimEnd() + '…'
}

/**
 * Middle-ellipsis truncation. Keeps the head AND tail visible so a long
 * filesystem path collapses in its middle rather than losing the
 * filename. Used by the welcome modal's folder picker to fit a default
 * SuperWhisper path into one row without losing "/recordings" at the end.
 */
export function middleTruncate(s: string, max: number): string {
  if (s.length <= max) return s
  // Reserve one slot for the ellipsis; split the rest of the budget
  // slightly weighted toward the tail so paths still surface their
  // final segment (the filename / leaf folder).
  const budget = max - 1
  const headLen = Math.max(1, Math.floor(budget / 2))
  const tailLen = Math.max(1, budget - headLen)
  return `${s.slice(0, headLen)}…${s.slice(s.length - tailLen)}`
}

/** Format X-axis date ticks for activity charts. */
export function formatActivityTick(raw: unknown): string {
  const d = new Date(String(raw))
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}

/**
 * Format a TrendPoint.period string for an X-axis tick. The period string
 * can come in three shapes depending on the active range bucketing:
 *   • YYYY-MM-DD  → "5 Mar"          (daily)
 *   • YYYY-Www    → "W12"            (weekly)
 *   • YYYY-MM     → "Mar 26"         (monthly, with 2-digit year)
 * Falls back to the raw string if the shape doesn't match.
 */
export function formatTrendTick(raw: unknown): string {
  const v = String(raw)
  // Daily: 2026-03-05
  const dayMatch = v.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (dayMatch) {
    const d = new Date(Number(dayMatch[1]), Number(dayMatch[2]) - 1, Number(dayMatch[3]))
    return isNaN(d.getTime())
      ? v
      : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }
  // Weekly: 2026-W12 — just emit the W## (year crossover is visually inferable).
  const weekMatch = v.match(/^(\d{4})-W(\d{2})$/)
  if (weekMatch) return `W${weekMatch[2]}`
  // Monthly: 2026-03
  const monthMatch = v.match(/^(\d{4})-(\d{2})$/)
  if (monthMatch) {
    const d = new Date(Number(monthMatch[1]), Number(monthMatch[2]) - 1, 1)
    return isNaN(d.getTime())
      ? v
      : d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' })
  }
  return v
}

/**
 * Render an ISO timestamp as a relative time string ("just now",
 * "5m ago", "2h ago", "3d ago"). Returns the empty string for an
 * unparseable input — callers usually display a dash in that case.
 *
 * Lives here so the Settings cards (Recordings folder, Sync action bar,
 * Connection card) can share the same wording.
 */
export function relativeTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (isNaN(t)) return ''
  const diffSec = Math.max(0, Math.floor((Date.now() - t) / 1000))
  if (diffSec < 30) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffD = Math.floor(diffHr / 24)
  return `${diffD}d ago`
}
