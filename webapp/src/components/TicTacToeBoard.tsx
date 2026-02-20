import React, { useState, useEffect } from 'react'
import { reactAI } from '../../../bridge/src/reactAI.js'

function calculateWinner(board: string[]): string | null {
  const lines = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8],
    [0, 3, 6], [1, 4, 7], [2, 5, 8],
    [0, 4, 8], [2, 4, 6],
  ]
  for (const [a, b, c] of lines) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) return board[a]
  }
  return null
}

/**
 * @reactAi
 * @key tictactoe-board
 * @description A self-contained Tic-Tac-Toe game board. The AI can make moves by patching the board array and set a custom status message.
 * @contextSummary Renders as the full game on the Tic-Tac-Toe page. board is a 9-element array indexed row-major: 0=top-left, 1=top-mid, 2=top-right, 3=mid-left, 4=center, 5=mid-right, 6=bot-left, 7=bot-mid, 8=bot-right.
 */
interface TicTacToeBoardProps {
  /** @reactAi The 9-cell board state: array of 'X', 'O', or '' (empty). Index 0=top-left, 2=top-right, 4=center, 8=bot-right. */
  board: string[]
  /** @reactAi Optional status message override shown above the board */
  statusMessage?: string
}

const TicTacToeBoardInner = ({ board: boardProp, statusMessage: statusOverride }: TicTacToeBoardProps) => {
  const [board, setBoard] = useState<string[]>(boardProp)
  const [isX, setIsX] = useState(true)

  const boardKey = boardProp.join(',')
  useEffect(() => {
    setBoard([...boardProp])
    const xCount = boardProp.filter((c) => c === 'X').length
    const oCount = boardProp.filter((c) => c === 'O').length
    setIsX(xCount <= oCount)
  }, [boardKey])

  const winner = calculateWinner(board)
  const isDraw = !winner && board.every((c) => c !== '')
  const gameOver = !!winner || isDraw

  const derivedStatus = winner
    ? `${winner} wins!`
    : isDraw
      ? "It's a draw!"
      : `${isX ? 'X' : 'O'}'s turn`

  const displayStatus = statusOverride || derivedStatus

  function handleCellClick(i: number) {
    if (board[i] || gameOver) return
    const next = [...board]
    next[i] = isX ? 'X' : 'O'
    setBoard(next)
    setIsX(!isX)
  }

  function handleReset() {
    setBoard(Array(9).fill(''))
    setIsX(true)
  }

  return (
    <div>
      <p style={{ fontSize: 18, fontWeight: 'bold', margin: '0 0 20px', minHeight: 28 }}>
        {displayStatus}
      </p>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 96px)',
          gridTemplateRows: 'repeat(3, 96px)',
          border: '2px solid black',
          width: 'fit-content',
        }}
      >
        {board.map((cell, i) => {
          const col = i % 3
          const row = Math.floor(i / 3)
          return (
            <button
              key={i}
              onClick={() => handleCellClick(i)}
              style={{
                width: 96,
                height: 96,
                fontSize: 40,
                fontWeight: 'bold',
                fontFamily: 'monospace',
                background: 'white',
                border: 'none',
                borderRight: col < 2 ? '2px solid black' : 'none',
                borderBottom: row < 2 ? '2px solid black' : 'none',
                cursor: gameOver || cell ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {cell}
            </button>
          )
        })}
      </div>

      <button
        onClick={handleReset}
        style={{
          marginTop: 24,
          padding: '9px 24px',
          border: '2px solid black',
          background: 'white',
          fontFamily: 'monospace',
          fontSize: 13,
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        Reset
      </button>
    </div>
  )
}

export const TicTacToeBoard = reactAI(TicTacToeBoardInner, {
  key: 'tictactoe-board',
  description: 'Self-contained Tic-Tac-Toe board. AI can patch board (9-element array) to make moves, and statusMessage for custom text.',
})
