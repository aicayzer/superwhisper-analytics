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

/** Format X-axis date ticks for activity charts. */
export function formatActivityTick(raw: unknown): string {
  const d = new Date(String(raw))
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { month: 'short', day: 'numeric' })
}
