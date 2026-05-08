'use client'

import { useCallback, useEffect, useState } from 'react'

import Link from 'next/link'

import { useProfile } from '@/components/profile-provider'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import type { RecordingListItem, RecordingsResponse } from '@/lib/types'

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

function fmtDuration(ms: number) {
  const s = Math.round(ms / 1000)
  const m = Math.floor(s / 60)
  const rem = s % 60
  if (m === 0) return `${s}s`
  return `${m}m ${rem}s`
}

const PAGE_SIZE = 25

export default function RecordingsPage() {
  const { profile } = useProfile()
  const [items, setItems] = useState<RecordingListItem[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchPage = useCallback((p: number, q: string) => {
    setLoading(true)
    const params = new URLSearchParams({
      page: String(p),
      pageSize: String(PAGE_SIZE),
      ...(q ? { search: q } : {}),
      ...(profile === 'on' ? { profile: 'on' } : {}),
    })
    fetch(`/api/recordings?${params}`)
      .then((r) => r.json())
      .then((d: RecordingsResponse & { error?: string; legacy?: boolean }) => {
        if (d.error === 'not_configured') { setError('not_configured'); return }
        setItems(d.items ?? [])
        setTotal(d.total ?? 0)
        if (d.legacy) setError('legacy')
      })
      .catch(() => setError('Failed to load recordings'))
      .finally(() => setLoading(false))
  }, [profile])

  useEffect(() => {
    setPage(1)
    fetchPage(1, query)
  }, [query, profile, fetchPage])

  useEffect(() => {
    fetchPage(page, query)
  }, [page, fetchPage, query])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  if (error === 'not_configured') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-12 text-center">
        <p className="text-lg font-medium">SuperWhisper path not configured</p>
        <Link href="/settings" className="text-sm underline underline-offset-4">Open settings</Link>
      </div>
    )
  }

  if (error === 'legacy') {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 p-12 text-center">
        <p className="text-base font-medium text-muted-foreground">Individual recordings are not available for the ON legacy profile.</p>
        <p className="text-sm text-muted-foreground">Switch to Default to browse recordings.</p>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        <Input
          placeholder="Search transcripts…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { setQuery(search); setPage(1) } }}
          className="max-w-sm"
        />
        <Button variant="outline" size="sm" onClick={() => { setQuery(search); setPage(1) }}>Search</Button>
        {query && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(''); setQuery(''); setPage(1) }}>Clear</Button>
        )}
        <span className="text-sm text-muted-foreground ml-auto">{total.toLocaleString()} recordings</span>
      </div>

      {loading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground py-12 text-center">No recordings found.</p>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <Link key={r.id} href={`/recordings/${r.id}`} className="block">
              <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                <CardContent className="py-3 px-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-muted-foreground">{fmtDate(r.datetime)}</span>
                        <Badge variant="outline" className="text-xs px-1.5 py-0 h-5">{r.modeName}</Badge>
                        {r.primaryTopic !== 'Unknown' && (
                          <Badge variant="secondary" className="text-xs px-1.5 py-0 h-5">{r.primaryTopic}</Badge>
                        )}
                      </div>
                      <p className="text-sm text-foreground line-clamp-2 leading-relaxed">
                        {r.excerpt || <span className="text-muted-foreground italic">No transcript</span>}
                      </p>
                    </div>
                    <div className="text-right shrink-0 text-xs text-muted-foreground space-y-0.5">
                      <div>{r.wordCount.toLocaleString()} words</div>
                      <div>{fmtDuration(r.duration)}</div>
                      {r.wordsPerMinute > 0 && <div>{r.wordsPerMinute} wpm</div>}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
            Next
          </Button>
        </div>
      )}
    </div>
  )
}
