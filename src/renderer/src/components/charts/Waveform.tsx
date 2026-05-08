import { useEffect, useRef } from 'react'
import { cn } from '@renderer/lib/cn'

interface WaveformProps {
  peaks: number[]
  /** 0..1 — fraction of duration that's been played. */
  progress: number
  /** Called with a fraction 0..1 when the user clicks/drags. */
  onSeek?: (frac: number) => void
  className?: string
}

/**
 * Hand-rolled SVG waveform. One rect per peak; rects to the left of the
 * cursor are filled "played", to the right are hairline. A 1.5px-wide
 * cursor sits at the progress fraction.
 */
export function Waveform({ peaks, progress, onSeek, className }: WaveformProps): React.JSX.Element {
  const ref = useRef<SVGSVGElement>(null)
  const draggingRef = useRef(false)

  useEffect(() => {
    if (!onSeek) return undefined
    const onMove = (e: PointerEvent): void => {
      if (!draggingRef.current || !ref.current) return
      const rect = ref.current.getBoundingClientRect()
      const f = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
      onSeek(f)
    }
    const onUp = (): void => {
      draggingRef.current = false
    }
    document.addEventListener('pointermove', onMove)
    document.addEventListener('pointerup', onUp)
    return () => {
      document.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerup', onUp)
    }
  }, [onSeek])

  const handleDown = (e: React.PointerEvent<SVGSVGElement>): void => {
    if (!onSeek || !ref.current) return
    draggingRef.current = true
    const rect = ref.current.getBoundingClientRect()
    const f = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
    onSeek(f)
  }

  const VB_W = 100
  const VB_H = 44
  const stride = VB_W / peaks.length

  return (
    <svg
      ref={ref}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      preserveAspectRatio="none"
      onPointerDown={handleDown}
      className={cn('block h-11 w-full select-none', onSeek && 'cursor-pointer', className)}
      role="slider"
      aria-valuemin={0}
      aria-valuemax={1}
      aria-valuenow={progress}
    >
      {peaks.map((p, i) => {
        const h = Math.max(1.5, p * VB_H * 0.85)
        const x = i * stride
        const y = (VB_H - h) / 2
        const xCenterFrac = (x + stride / 2) / VB_W
        const played = xCenterFrac <= progress
        return (
          <rect
            key={i}
            x={x + stride * 0.15}
            y={y}
            width={stride * 0.7}
            height={h}
            rx={0.6}
            fill={played ? 'var(--foreground)' : 'var(--border)'}
          />
        )
      })}
      <line
        x1={progress * VB_W}
        x2={progress * VB_W}
        y1={2}
        y2={VB_H - 2}
        stroke="var(--foreground)"
        strokeWidth={1.5}
      />
    </svg>
  )
}
