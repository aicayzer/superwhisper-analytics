import fs from 'fs/promises'
import path from 'path'

import { NextResponse } from 'next/server'

import { invalidateCache } from '@/lib/cache'
import { getSuperwhisperPath } from '@/lib/scanner'

export async function GET() {
  const p = getSuperwhisperPath()
  return NextResponse.json({ path: p, configured: !!p })
}

export async function POST(req: Request) {
  const body = await req.json()
  const newPath = String(body.path ?? '').trim()

  if (!newPath) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 })
  }

  // Verify the path looks like a SuperWhisper directory
  try {
    await fs.access(path.join(newPath, 'recordings'))
  } catch {
    return NextResponse.json(
      { error: 'No recordings folder found at that path. Check the path and try again.' },
      { status: 400 }
    )
  }

  // Write to .env.local
  const envPath = path.join(process.cwd(), '.env.local')
  let existing = ''
  try {
    existing = await fs.readFile(envPath, 'utf-8')
  } catch {
    // file doesn't exist yet — that's fine
  }

  const lines = existing.split('\n').filter((l) => !l.startsWith('SUPERWHISPER_PATH='))
  lines.push(`SUPERWHISPER_PATH=${newPath}`)
  await fs.writeFile(envPath, lines.join('\n').trim() + '\n', 'utf-8')

  // Set in current process env so it takes effect without restart
  process.env.SUPERWHISPER_PATH = newPath
  invalidateCache()

  return NextResponse.json({ ok: true, path: newPath })
}
