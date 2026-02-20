import { reactAI } from '../../../../bridge/src/reactAI.js'

/**
 * @reactAi
 * @key demo-card
 * @description A card component that displays a title, body text, and CTA button.
 * @contextSummary Renders inside the main content area on the home page.
 */
interface DemoCardProps {
  /** @reactAi Headline text shown at top of card */
  title: string
  /** @reactAi Body paragraph text */
  body?: string
  /** @reactAi Label for the CTA button */
  buttonLabel?: string
  /** @noAI Internal: never writable by AI */
  onButtonClick: () => void
}

const DemoCardInner = ({ title, body, buttonLabel, onButtonClick }: DemoCardProps) => {
  return (
    <div style={{ border: '1px solid #ccc', borderRadius: 8, padding: 16, maxWidth: 400 }}>
      <h2 style={{ margin: '0 0 8px' }}>{title}</h2>
      {body && <p style={{ margin: '0 0 12px', color: '#555' }}>{body}</p>}
      <button onClick={onButtonClick} style={{ padding: '8px 16px', cursor: 'pointer' }}>
        {buttonLabel ?? 'Learn More'}
      </button>
    </div>
  )
}

export const DemoCard = reactAI(DemoCardInner, {
  key: 'demo-card',
  description: 'A card component that displays a title, body text, and CTA button.',
})
