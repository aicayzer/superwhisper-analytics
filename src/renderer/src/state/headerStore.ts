import { useEffect } from 'react'
import { create } from 'zustand'

/**
 * Header-actions slot — screens register a node that renders between the
 * page title and the RangePill in MainHeader. Replaces the old pattern of
 * threading per-screen action props through the layout.
 *
 * Use `useHeaderActions(node)` from a screen: the node is registered on
 * mount, replaced on subsequent renders, and cleared on unmount. Only one
 * screen owns the slot at a time — that's fine because there's only ever
 * one route mounted under the layout.
 */
interface HeaderState {
  actions: React.ReactNode | null
  setActions: (node: React.ReactNode | null) => void
}

export const useHeaderStore = create<HeaderState>((set) => ({
  actions: null,
  setActions: (node) => set({ actions: node })
}))

/**
 * Register a node into the header-actions slot for the lifetime of the
 * calling component. Pass `null` to clear (or just unmount).
 *
 * Caller is responsible for passing a stable node reference between
 * renders if the children would otherwise re-render the slot every tick;
 * for typical use (a few IconButtons) the cost is negligible.
 */
export function useHeaderActions(node: React.ReactNode | null): void {
  const setActions = useHeaderStore((s) => s.setActions)
  useEffect(() => {
    setActions(node)
    return () => setActions(null)
  }, [node, setActions])
}
