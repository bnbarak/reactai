import React from 'react'
import { reactAI } from '../../../../bridge/src/reactAI.js'

interface DataPoint {
  date: string
  value: number
}

/**
 * @reactAi
 * @key portfolio-chart
 * @description A line chart showing portfolio total value over the past 12 months.
 * @contextSummary Renders below the positions table on the Portfolio page.
 */
interface PortfolioChartProps {
  /** @reactAi Chart title shown above the SVG */
  title: string
  /** @noAI Array of { date, value } data points to plot */
  data: DataPoint[]
}

const PortfolioChartInner = ({ title, data }: PortfolioChartProps) => {
  const W = 640
  const H = 200
  const PAD = { top: 16, right: 24, bottom: 36, left: 64 }
  const innerW = W - PAD.left - PAD.right
  const innerH = H - PAD.top - PAD.bottom

  const values = data.map((d) => d.value)
  const minV = Math.min(...values) * 0.97
  const maxV = Math.max(...values) * 1.02
  const range = maxV - minV

  const toX = (i: number) => PAD.left + (i / (data.length - 1)) * innerW
  const toY = (v: number) => PAD.top + innerH - ((v - minV) / range) * innerH

  const linePath = data.map((d, i) => `${i === 0 ? 'M' : 'L'}${toX(i)},${toY(d.value)}`).join(' ')
  const areaPath = `${linePath} L${toX(data.length - 1)},${PAD.top + innerH} L${toX(0)},${PAD.top + innerH} Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    v: minV + p * range,
    y: PAD.top + innerH - p * innerH,
  }))

  return (
    <div>
      <p style={{ fontWeight: 'bold', fontSize: 13, margin: '0 0 12px', letterSpacing: 0.5 }}>
        {title}
      </p>
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H}`}
        style={{ display: 'block', overflow: 'visible' }}
      >
        {/* Grid lines */}
        {yTicks.map(({ y }, i) => (
          <line
            key={i}
            x1={PAD.left}
            y1={y}
            x2={PAD.left + innerW}
            y2={y}
            stroke="#eee"
            strokeWidth="1"
          />
        ))}

        {/* Area fill */}
        <path d={areaPath} fill="rgba(0,0,0,0.04)" />

        {/* Line */}
        <path d={linePath} fill="none" stroke="black" strokeWidth="2.5" strokeLinejoin="round" />

        {/* Dots */}
        {data.map((d, i) => (
          <circle key={i} cx={toX(i)} cy={toY(d.value)} r="3.5" fill="black" />
        ))}

        {/* X axis */}
        <line
          x1={PAD.left}
          y1={PAD.top + innerH}
          x2={PAD.left + innerW}
          y2={PAD.top + innerH}
          stroke="black"
          strokeWidth="1.5"
        />

        {/* Y axis */}
        <line
          x1={PAD.left}
          y1={PAD.top}
          x2={PAD.left}
          y2={PAD.top + innerH}
          stroke="black"
          strokeWidth="1.5"
        />

        {/* X labels */}
        {data.map((d, i) => (
          <text
            key={i}
            x={toX(i)}
            y={PAD.top + innerH + 22}
            textAnchor="middle"
            fontSize="11"
            fontFamily="monospace"
            fill="black"
          >
            {d.date}
          </text>
        ))}

        {/* Y labels */}
        {yTicks.map(({ v, y }, i) => (
          <text
            key={i}
            x={PAD.left - 10}
            y={y + 4}
            textAnchor="end"
            fontSize="11"
            fontFamily="monospace"
            fill="#555"
          >
            ${(v / 1000).toFixed(0)}k
          </text>
        ))}
      </svg>
    </div>
  )
}

export const PortfolioChart = reactAI(PortfolioChartInner, {
  key: 'portfolio-chart',
  description: 'A line chart showing portfolio value over 12 months.',
})
