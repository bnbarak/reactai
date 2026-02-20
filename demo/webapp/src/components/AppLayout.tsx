import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { reactAI } from '../../../../bridge/src/reactAI.js'
import { useAiMarker } from '../../../../bridge/src/useAiMarker.js'
import { TicTacToePage } from '../pages/TicTacToePage.js'
import { PortfolioPage } from '../pages/PortfolioPage.js'
import { SettingsPage } from '../pages/SettingsPage.js'

type Page = 'portfolio' | 'tictactoe' | 'settings'

/**
 * @reactAi
 * @key app-layout
 * @description The main application layout with page navigation. Controls which page is displayed.
 * @contextSummary Root layout component. The activePage prop controls which page is shown.
 */
interface AppLayoutProps {
  /** @reactAi The currently active page */
  activePage: 'portfolio' | 'tictactoe' | 'settings'
}

const AppLayoutInner = ({ activePage }: AppLayoutProps) => {
  const [page, setPage] = useState<Page>(activePage)

  useEffect(() => {
    setPage(activePage)
  }, [activePage])

  useAiMarker('activePage', page)

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <nav style={{ display: 'flex', borderBottom: '2px solid black', flexShrink: 0 }}>
        {(['portfolio', 'tictactoe', 'settings'] as Page[]).map((p) => (
          <button
            key={p}
            onClick={() => setPage(p)}
            style={{
              padding: '11px 24px',
              border: 'none',
              borderRight: '1px solid black',
              background: page === p ? 'black' : 'white',
              color: page === p ? 'white' : 'black',
              fontFamily: 'monospace',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: page === p ? 'bold' : 'normal',
              letterSpacing: 0.5,
            }}
          >
            {p === 'portfolio' ? 'Portfolio' : p === 'tictactoe' ? 'Tic-Tac-Toe' : 'Settings'}
          </button>
        ))}
      </nav>

      <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={page}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -18 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            style={{ position: 'absolute', inset: 0, overflowY: 'auto' }}
          >
            {page === 'portfolio' ? <PortfolioPage /> : page === 'tictactoe' ? <TicTacToePage /> : <SettingsPage />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

export const AppLayout = reactAI(AppLayoutInner, {
  key: 'app-layout',
  description: 'Main app layout with page navigation. Controls which page is displayed.',
})
