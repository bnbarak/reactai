import React from 'react'
import { PortfolioHeader } from '../components/PortfolioHeader.js'
import { StockPosition } from '../components/StockPosition.js'
import { PortfolioChart } from '../components/PortfolioChart.js'

const STOCKS = [
  { ticker: 'NVDA', companyName: 'NVIDIA Corp.', shares: 18, currentPrice: 887.40, changePercent: 4.2 },
  { ticker: 'AAPL', companyName: 'Apple Inc.', shares: 50, currentPrice: 189.30, changePercent: 1.1 },
  { ticker: 'MSFT', companyName: 'Microsoft Corp.', shares: 25, currentPrice: 412.80, changePercent: -0.5 },
  { ticker: 'TSLA', companyName: 'Tesla Inc.', shares: 30, currentPrice: 248.50, changePercent: 2.3 },
]

const CHART_DATA = [
  { date: 'Sep', value: 38900 },
  { date: 'Oct', value: 43500 },
  { date: 'Nov', value: 45200 },
  { date: 'Dec', value: 43900 },
  { date: 'Jan', value: 46173 },
]

const totalValue = STOCKS.reduce((sum, s) => sum + s.shares * s.currentPrice, 0)

export const PortfolioPage = () => {
  return (
    <div style={{ padding: 40, maxWidth: 700 }}>
      <PortfolioHeader
        headline="My Portfolio"
        description="Tech-heavy growth portfolio."
        totalValue={totalValue}
      />

      <div style={{ marginBottom: 32 }}>
        {STOCKS.map((stock) => (
          <StockPosition key={stock.ticker} {...stock} />
        ))}
      </div>

      <PortfolioChart title="Portfolio Value — 5 months" data={CHART_DATA} />
    </div>
  )
}
