import { describe, it, expect, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { useAiMarker } from '../useAiMarker.js'
import { markerRegistry } from '../MarkerRegistry.js'

const MarkerComponent = ({ name, value }: { name: string; value: unknown }) => {
  useAiMarker(name, value)
  return null
}

describe('useAiMarker', () => {
  beforeEach(() => {
    Object.keys(markerRegistry.getAll()).forEach((k) => markerRegistry.remove(k))
  })

  it('useAiMarker_onMount_setsMarker', () => {
    render(<MarkerComponent name="activePage" value="portfolio" />)

    expect(markerRegistry.getAll().activePage).toBe('portfolio')
  })

  it('useAiMarker_onUnmount_removesMarker', () => {
    const { unmount } = render(<MarkerComponent name="activePage" value="portfolio" />)

    unmount()

    expect(markerRegistry.getAll()).not.toHaveProperty('activePage')
  })

  it('useAiMarker_valueChanges_updatesMarker', () => {
    const { rerender } = render(<MarkerComponent name="activePage" value="portfolio" />)

    rerender(<MarkerComponent name="activePage" value="settings" />)

    expect(markerRegistry.getAll().activePage).toBe('settings')
  })

  it('useAiMarker_nameChanges_removesOldKeyAndSetsNew', () => {
    const { rerender } = render(<MarkerComponent name="pageA" value="x" />)

    rerender(<MarkerComponent name="pageB" value="x" />)

    expect(markerRegistry.getAll()).not.toHaveProperty('pageA')
    expect(markerRegistry.getAll().pageB).toBe('x')
  })
})
