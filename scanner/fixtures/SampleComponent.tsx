import React from 'react'

/**
 * @reactAi
 * @key sample-card
 * @description A sample card component for testing purposes.
 * @contextSummary Renders inside the main content area.
 */
interface SampleCardProps {
  /** @reactAi Headline text shown at the top of the card */
  title: string
  /** @reactAi Optional body paragraph text */
  body?: string
  /** @reactAi Label for the CTA button */
  buttonLabel?: string
  /** @noAI Internal: never writable by AI */
  onClick: () => void
}

export function SampleCard({ title, body, buttonLabel, onClick }: SampleCardProps) {
  return (
    <div>
      <h2>{title}</h2>
      {body && <p>{body}</p>}
      <button onClick={onClick}>{buttonLabel ?? 'Click'}</button>
    </div>
  )
}
