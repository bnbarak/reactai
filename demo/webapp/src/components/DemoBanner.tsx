import { reactAI } from '../../../../bridge/src/reactAI.js'

/**
 * @reactAi
 * @key demo-banner
 * @description A banner component with a headline and light/dark theme support.
 * @contextSummary Renders at the top of the page as the hero section.
 */
interface DemoBannerProps {
  /** @reactAi Main headline text */
  headline: string
  /** @reactAi Color theme of the banner */
  theme?: 'light' | 'dark'
}

const DemoBannerInner = ({ headline, theme = 'light' }: DemoBannerProps) => {
  const isDark = theme === 'dark'
  return (
    <div
      style={{
        padding: '32px 24px',
        background: isDark ? '#1a1a2e' : '#f0f4ff',
        color: isDark ? '#ffffff' : '#1a1a2e',
        borderRadius: 8,
        textAlign: 'center',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '2rem' }}>{headline}</h1>
    </div>
  )
}

export const DemoBanner = reactAI(DemoBannerInner, {
  key: 'demo-banner',
  description: 'A banner component with a headline and light/dark theme support.',
})
