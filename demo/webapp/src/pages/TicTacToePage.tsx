import React from 'react'
import { TicTacToeBoard } from '../components/TicTacToeBoard.js'

export const TicTacToePage = () => {
  return (
    <div style={{ padding: 40 }}>
      <h2 style={{ margin: '0 0 28px', fontSize: 20, fontWeight: 'bold', letterSpacing: -0.5 }}>
        Tic-Tac-Toe
      </h2>
      <TicTacToeBoard board={['', '', '', '', '', '', '', '', '']} />
    </div>
  )
}
