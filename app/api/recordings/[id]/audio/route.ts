import fs from 'fs'

import { NextRequest, NextResponse } from 'next/server'

import { getAudioPath, getSuperwhisperPath } from '@/lib/scanner'

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const swPath = getSuperwhisperPath()
  if (!swPath) return NextResponse.json({ error: 'not_configured' }, { status: 503 })

  // Sanitise id — only allow alphanumeric and underscores (timestamp folder names)
  if (!/^[\w-]+$/.test(id)) {
    return NextResponse.json({ error: 'invalid_id' }, { status: 400 })
  }

  const audioPath = getAudioPath(swPath, id)

  let stat: fs.Stats
  try {
    stat = fs.statSync(audioPath)
  } catch {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  const stream = fs.createReadStream(audioPath)
  const body = new ReadableStream({
    start(controller) {
      stream.on('data', (chunk) => controller.enqueue(chunk))
      stream.on('end', () => controller.close())
      stream.on('error', (err) => controller.error(err))
    },
    cancel() {
      stream.destroy()
    },
  })

  return new NextResponse(body, {
    headers: {
      'Content-Type': 'audio/wav',
      'Content-Length': String(stat.size),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
