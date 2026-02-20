import React from 'react'
import { reactAI } from '../../../bridge/src/reactAI.js'

/**
 * @reactAi
 * @key stock-position
 * @description A single stock position row in the portfolio showing ticker, price, and daily change.
 * @contextSummary Renders as a card inside the positions list on the Portfolio page.
 */
interface StockPositionProps {
  /** @reactAi Stock ticker symbol (e.g. AAPL) */
  ticker: string
  /** @reactAi Full company name */
  companyName: string
  /** @reactAi Number of shares held */
  shares: number
  /** @reactAi Current stock price in USD */
  currentPrice: number
  /** @reactAi Daily price change percentage (positive or negative) */
  changePercent: number
}

const StockPositionInner = ({
  ticker,
  companyName,
  shares,
  currentPrice,
  changePercent,
}: StockPositionProps) => {
  const value = shares * currentPrice
  const isUp = changePercent >= 0

  return (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px 0', borderBottom: '1px solid #eee', gap: 12 }}>
      <span style={{ fontWeight: 'bold', fontFamily: 'monospace', width: 56 }}>{ticker}</span>
      <span style={{ flex: 1, color: '#444', fontSize: 13 }}>{companyName}</span>
      <span style={{ fontFamily: 'monospace', color: '#666', fontSize: 13 }}>{shares} sh</span>
      <span style={{ fontFamily: 'monospace', width: 72, textAlign: 'right' }}>${currentPrice.toFixed(2)}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 'bold', width: 88, textAlign: 'right' }}>
        ${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </span>
      <span style={{ fontFamily: 'monospace', fontWeight: 'bold', width: 64, textAlign: 'right', color: isUp ? 'black' : '#888' }}>
        {isUp ? '+' : ''}{changePercent.toFixed(2)}%
      </span>
    </div>
  )
}

export const StockPosition = reactAI(StockPositionInner, {
  key: 'stock-position',
  description: 'A stock position row showing ticker, company, shares, price, value, and daily change.',
})
