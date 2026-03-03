import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Chess } from 'chess.js';
import { useStateWithAi, useSession } from '@bnbarak/reactai/react';
import { snapshotRegistry } from '@bnbarak/reactai/react';

const ELO_LEVELS = [400, 600, 800, 1000, 1200, 1400, 1600, 1800, 2000, 2200];

const PIECE_UNICODE: Record<string, string> = {
  K: '♔',
  Q: '♕',
  R: '♖',
  B: '♗',
  N: '♘',
  P: '♙',
  k: '♚',
  q: '♛',
  r: '♜',
  b: '♝',
  n: '♞',
  p: '♟',
};

function fenToBoard(fen: string): (string | null)[][] {
  const [boardPart] = fen.split(' ');
  return boardPart.split('/').map((row) => {
    const cells: (string | null)[] = [];
    for (const ch of row) {
      if (/\d/.test(ch)) {
        for (let i = 0; i < parseInt(ch); i++) cells.push(null);
      } else {
        cells.push(ch);
      }
    }
    return cells;
  });
}

function indexToSquare(row: number, col: number): string {
  return String.fromCharCode(97 + col) + (8 - row);
}

function deriveStatus(chess: Chess, thinking: boolean): string {
  if (thinking) return 'AI thinking…';
  if (chess.isCheckmate())
    return chess.turn() === 'w' ? 'Black wins by checkmate' : 'White wins by checkmate';
  if (chess.isDraw()) return 'Draw';
  if (chess.isCheck()) return `${chess.turn() === 'w' ? 'White' : 'Black'} is in check`;
  return `${chess.turn() === 'w' ? 'White' : 'Black'} to move`;
}

export const ChessPage = () => {
  const { sessionId, serverUrl } = useSession();
  const [chess] = useState(() => new Chess());
  const [fen, setFen] = useState(() => chess.fen());
  const [selected, setSelected] = useState<string | null>(null);
  const [legalTargets, setLegalTargets] = useState<string[]>([]);
  const [elo, setElo] = useState(1200);
  const [thinking, setThinking] = useState(false);

  // AI patches pendingMove with a move in SAN notation e.g. "e5", "Nf6", "O-O"
  const [aiState, setAiState, aiRef] = useStateWithAi('Chess game board — AI plays Black', {
    pendingMove: '',
  });

  const callAiRef = useRef<(fen: string, lastMove: string) => Promise<void>>(async () => {});
  const retryCountRef = useRef(0);

  useEffect(() => {
    const move = (aiState.pendingMove as string).trim();
    if (!move) return;
    let moveApplied = false;
    try {
      const result = chess.move(move);
      if (result) {
        setFen(chess.fen());
        moveApplied = true;
      }
    } catch {
      // invalid move — will retry below
    }
    setAiState({ pendingMove: '' });
    if (moveApplied) {
      retryCountRef.current = 0;
      setThinking(false);
    } else if (retryCountRef.current < 3) {
      retryCountRef.current += 1;
      callAiRef.current(chess.fen(), '(retry — previous move was invalid)');
    } else {
      retryCountRef.current = 0;
      setThinking(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- chess and setAiState are stable
  }, [aiState.pendingMove]);

  const callAi = useCallback(
    async (currentFen: string, lastMove: string) => {
      if (!sessionId) return;
      const snapshot = snapshotRegistry.getAll();
      const legalMoves = chess.moves();
      const prompt =
        `You are playing Black in a chess game at ${elo} ELO strength. ` +
        `White just played ${lastMove}. Current position FEN: ${currentFen}. ` +
        `Legal moves available: ${legalMoves.join(', ')}. ` +
        `Pick ONE move from the legal moves list that is best for a ${elo}-rated player. ` +
        `Patch pendingMove with your chosen move exactly as written in the legal moves list. No other text.`;
      const res = await fetch(`${serverUrl}/ai/prompt`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId,
          prompt,
          snapshot,
          currentUrl: window.location.href,
        }),
      });
      const result = await res.json();
      if (!result.applied) {
        setThinking(false);
      }
    },
    [sessionId, serverUrl, elo],
  );

  useEffect(() => {
    callAiRef.current = callAi;
  }, [callAi]);

  function handleSquareClick(row: number, col: number) {
    if (thinking || chess.isGameOver() || chess.turn() !== 'w') return;
    const sq = indexToSquare(row, col);
    const board = fenToBoard(fen);
    const piece = board[row][col];

    if (selected) {
      if (legalTargets.includes(sq)) {
        const move = chess.move({ from: selected, to: sq, promotion: 'q' });
        if (move) {
          const newFen = chess.fen();
          setFen(newFen);
          setAiState({ pendingMove: '' });
          setSelected(null);
          setLegalTargets([]);
          if (!chess.isGameOver()) {
            setThinking(true);
            callAi(newFen, move.san);
          }
          return;
        }
      }
      if (piece && piece === piece.toUpperCase()) {
        setSelected(sq);
        setLegalTargets(
          chess
            .moves({ square: sq as Parameters<typeof chess.moves>[0]['square'], verbose: true })
            .map((m) => m.to),
        );
        return;
      }
      setSelected(null);
      setLegalTargets([]);
      return;
    }

    if (piece && piece === piece.toUpperCase()) {
      setSelected(sq);
      setLegalTargets(
        chess
          .moves({ square: sq as Parameters<typeof chess.moves>[0]['square'], verbose: true })
          .map((m) => m.to),
      );
    }
  }

  function handleReset() {
    chess.reset();
    const newFen = chess.fen();
    setFen(newFen);
    setAiState({ pendingMove: '' });
    setSelected(null);
    setLegalTargets([]);
    setThinking(false);
  }

  const board = fenToBoard(fen);
  const status = deriveStatus(chess, thinking);

  return (
    <div style={{ padding: 40 }} ref={aiRef as React.Ref<HTMLDivElement>}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <h2 style={{ margin: 0, fontSize: 20, fontWeight: 'bold', letterSpacing: -0.5 }}>Chess</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#666' }}>AI level:</span>
          <select
            value={elo}
            onChange={(e) => setElo(Number(e.target.value))}
            style={{
              fontFamily: 'monospace',
              fontSize: 11,
              border: '1px solid black',
              padding: '3px 6px',
              background: 'white',
              cursor: 'pointer',
            }}
          >
            {ELO_LEVELS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p
        style={{
          fontFamily: 'monospace',
          fontSize: 13,
          margin: '0 0 16px',
          fontWeight: 'bold',
          color: thinking ? '#888' : 'black',
          fontStyle: thinking ? 'italic' : 'normal',
        }}
      >
        {status}
      </p>

      <div style={{ display: 'inline-block', border: '2px solid black' }}>
        {board.map((row, ri) => (
          <div key={ri} style={{ display: 'flex' }}>
            {row.map((piece, ci) => {
              const sq = indexToSquare(ri, ci);
              const isLight = (ri + ci) % 2 === 0;
              const isSelected = selected === sq;
              const isTarget = legalTargets.includes(sq);

              let bg = isLight ? '#f0d9b5' : '#b58863';
              if (isSelected) bg = '#f6f669';
              else if (isTarget) bg = isLight ? '#cdd26a' : '#aaa23a';

              return (
                <div
                  key={ci}
                  onClick={() => handleSquareClick(ri, ci)}
                  style={{
                    width: 64,
                    height: 64,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 42,
                    background: bg,
                    cursor:
                      thinking || chess.isGameOver() || chess.turn() !== 'w'
                        ? 'default'
                        : 'pointer',
                    userSelect: 'none',
                  }}
                >
                  {piece ? (
                    PIECE_UNICODE[piece]
                  ) : isTarget ? (
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: 'rgba(0,0,0,0.18)',
                      }}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10, display: 'flex', gap: 6, alignItems: 'center' }}>
        <div
          style={{
            width: 10,
            height: 10,
            background: 'white',
            border: '1px solid black',
            borderRadius: '50%',
          }}
        />
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#666' }}>You are White</span>
        <div
          style={{ width: 10, height: 10, background: 'black', borderRadius: '50%', marginLeft: 8 }}
        />
        <span style={{ fontFamily: 'monospace', fontSize: 11, color: '#666' }}>AI is Black</span>
        <button
          onClick={handleReset}
          style={{
            marginLeft: 16,
            padding: '6px 18px',
            border: '2px solid black',
            background: 'white',
            fontFamily: 'monospace',
            fontSize: 11,
            cursor: 'pointer',
            fontWeight: 'bold',
          }}
        >
          New Game
        </button>
      </div>
    </div>
  );
};
