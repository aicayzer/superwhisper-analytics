/**
 * Lightweight runtime guards for renderer-supplied IPC payloads.
 *
 * `contextIsolation` keeps the renderer at arm's length, but the IPC
 * boundary still accepts whatever the renderer hands over. Each handler
 * that takes a payload calls into these guards before passing the value
 * to disk-touching code. Invalid input is rejected upstream of any side
 * effect.
 */

export function validString(v: unknown): v is string {
  return typeof v === 'string'
}

export function validBool(v: unknown): v is boolean {
  return typeof v === 'boolean'
}

export function validStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === 'string')
}
