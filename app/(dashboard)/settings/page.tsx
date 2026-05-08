'use client'

import { useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function SettingsPage() {
  const [currentPath, setCurrentPath] = useState('')
  const [inputPath, setInputPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    fetch('/api/config')
      .then((r) => r.json())
      .then((d) => {
        setCurrentPath(d.path ?? '')
        setInputPath(d.path ?? '')
      })
  }, [])

  const save = async () => {
    setSaving(true)
    setMessage(null)
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: inputPath }),
      })
      const data = await res.json()
      if (res.ok) {
        setCurrentPath(inputPath)
        setMessage({ type: 'success', text: 'Path saved. Navigate to Overview to load your data.' })
      } else {
        setMessage({ type: 'error', text: data.error ?? 'Failed to save path' })
      }
    } catch {
      setMessage({ type: 'error', text: 'Network error' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6 max-w-xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">SuperWhisper data path</CardTitle>
          <CardDescription>
            Point to the folder where SuperWhisper stores its data. Typically{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">~/Services/superwhisper</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {currentPath && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded px-3 py-2 font-mono break-all">
              Current: {currentPath}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="path">Path</Label>
            <Input
              id="path"
              value={inputPath}
              onChange={(e) => setInputPath(e.target.value)}
              placeholder="/Users/you/Services/superwhisper"
              className="font-mono text-sm"
            />
          </div>

          {message && (
            <p className={`text-sm ${message.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
              {message.text}
            </p>
          )}

          <Button onClick={save} disabled={saving || !inputPath.trim()}>
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">ON profile (legacy data)</CardTitle>
          <CardDescription>
            Drop your legacy CSV export into{' '}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">data/legacy/</code> inside the project directory,
            then switch to the ON profile in the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Expected files: <code className="text-xs">recordings_detail.csv</code>,{' '}
            <code className="text-xs">daily_summary.csv</code>,{' '}
            <code className="text-xs">hourly_patterns.csv</code>,{' '}
            <code className="text-xs">word_frequency.csv</code>,{' '}
            <code className="text-xs">filler_word_analysis.csv</code>,{' '}
            <code className="text-xs">mode_usage.csv</code>,{' '}
            <code className="text-xs">topic_distribution.csv</code>.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
