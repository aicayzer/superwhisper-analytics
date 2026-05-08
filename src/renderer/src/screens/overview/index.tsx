import { useSearchParams } from 'react-router-dom'
import { Switcher, type VariantId } from './Switcher'
import { VariantA } from './VariantA'
import { VariantB } from './VariantB'
import { VariantC } from './VariantC'

function isVariantId(v: string): v is VariantId {
  return v === 'a' || v === 'b' || v === 'c'
}

/**
 * Overview entry. Reads `?v=a|b|c` from the URL and renders the matching
 * variant. Defaults to A. The Switcher writes back to the URL so the
 * choice is shareable and survives reloads.
 */
export function Overview(): React.JSX.Element {
  const [params, setParams] = useSearchParams()
  const raw = params.get('v') ?? 'a'
  const current: VariantId = isVariantId(raw) ? raw : 'a'

  const setVariant = (id: VariantId): void => {
    const next = new URLSearchParams(params)
    if (id === 'a') next.delete('v')
    else next.set('v', id)
    setParams(next, { replace: true })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex justify-end pt-3">
        <Switcher current={current} onChange={setVariant} />
      </div>
      <div className="min-h-0 flex-1">
        {current === 'a' && <VariantA />}
        {current === 'b' && <VariantB />}
        {current === 'c' && <VariantC />}
      </div>
    </div>
  )
}
