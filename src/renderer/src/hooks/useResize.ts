import { useCallback, useState, type PointerEvent as ReactPointerEvent } from 'react'

export type ResizeDirection = 'grow-right' | 'grow-left'

interface UseResizeOptions {
  direction: ResizeDirection
  min: number
  max: number
  /** Returns the panel's current width — read at drag start. */
  getCurrentWidth: () => number
  /** Called on each pointer-move with the new clamped width. */
  onChange: (width: number) => void
}

interface UseResizeReturn {
  startResize: (e: ReactPointerEvent<HTMLElement>) => void
  isResizing: boolean
}

/**
 * Pure helper. Given a drag start state and the current pointer X,
 * returns the new width clamped to [min, max].
 *
 * Exported for testability — the hook below wraps it with React state +
 * pointer event listeners.
 */
export function computeWidth(params: {
  startWidth: number
  startX: number
  pointerX: number
  direction: ResizeDirection
  min: number
  max: number
}): number {
  const { startWidth, startX, pointerX, direction, min, max } = params
  const delta = pointerX - startX
  const target = direction === 'grow-right' ? startWidth + delta : startWidth - delta
  return Math.max(min, Math.min(max, target))
}

/**
 * Drag-to-resize hook for floating panels. Pointer-event based so it works
 * with both mouse and trackpad. Width state lives outside the hook (typically
 * in a Zustand store) — pass `getCurrentWidth` and `onChange`.
 */
export function useResize(options: UseResizeOptions): UseResizeReturn {
  const { direction, min, max, getCurrentWidth, onChange } = options
  const [isResizing, setIsResizing] = useState(false)

  const startResize = useCallback(
    (e: ReactPointerEvent<HTMLElement>) => {
      e.preventDefault()
      const startX = e.clientX
      const startWidth = getCurrentWidth()

      setIsResizing(true)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'

      const handleMove = (ev: PointerEvent): void => {
        onChange(
          computeWidth({
            startWidth,
            startX,
            pointerX: ev.clientX,
            direction,
            min,
            max
          })
        )
      }

      const handleUp = (): void => {
        setIsResizing(false)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        window.removeEventListener('pointermove', handleMove)
        window.removeEventListener('pointerup', handleUp)
      }

      window.addEventListener('pointermove', handleMove)
      window.addEventListener('pointerup', handleUp)
    },
    [direction, min, max, getCurrentWidth, onChange]
  )

  return { startResize, isResizing }
}
