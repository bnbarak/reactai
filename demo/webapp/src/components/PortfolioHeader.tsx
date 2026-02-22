import React from 'react'
import { reactAI } from '@bnbarak/reactai/react'

/**
 * @reactAi
 * @key portfolio-header
 * @description Portfolio page header showing total value, a headline, and optional commentary.
 * @contextSummary Renders at the top of the Portfolio page above the positions table.
 */
interface PortfolioHeaderProps {
  /** @reactAi Main headline for the portfolio section */
  headline: string
  /** @reactAi Short market commentary or description shown below the total */
  description?: string
  /** @noAI Computed total portfolio value in USD */
  totalValue: number
}

const PortfolioHeaderInner = ({ headline, description, totalValue }: PortfolioHeaderProps) => {
  return (
    <div style={{ marginBottom: 32, paddingBottom: 24, borderBottom: '2px solid black' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 22, fontWeight: 'bold', letterSpacing: -0.5 }}>
        {headline}
      </h1>
      <p
        style={{
          margin: '0 0 4px',
          fontSize: 38,
          fontWeight: 'bold',
          letterSpacing: -1.5,
          lineHeight: 1,
        }}
      >
        ${totalValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </p>
      {description && (
        <p style={{ margin: '10px 0 0', fontSize: 13, color: '#555', lineHeight: 1.5 }}>
          {description}
        </p>
      )}
    </div>
  )
}

export const PortfolioHeader = reactAI(PortfolioHeaderInner, {
  key: 'portfolio-header',
  description: 'Portfolio header with headline, total value, and optional market commentary.',
})
