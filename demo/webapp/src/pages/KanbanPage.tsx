import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useStateWithAi } from '@bnbarak/reactai/react';

type Column = 'backlog' | 'in-progress' | 'review' | 'done';
type Priority = 'high' | 'medium' | 'low';

interface CardState {
  title: string;
  column: Column;
  priority: Priority;
  assignee: string;
}

const PRIORITY_BADGE: Record<Priority, React.CSSProperties> = {
  high: { background: 'black', color: 'white' },
  medium: { background: '#555', color: 'white' },
  low: { background: '#ddd', color: 'black' },
};

const COLUMNS: Column[] = ['backlog', 'in-progress', 'review', 'done'];
const COLUMN_LABELS: Record<Column, string> = {
  backlog: 'Backlog',
  'in-progress': 'In Progress',
  review: 'Review',
  done: 'Done',
};

interface KanbanCardProps {
  description: string;
  initialState: CardState;
  onStateChange: (state: CardState) => void;
}

const KanbanCard = ({ description, initialState, onStateChange }: KanbanCardProps) => {
  const [state, , aiRef] = useStateWithAi(description, initialState, {
    priority: ['high', 'medium', 'low'],
    column: ['backlog', 'in-progress', 'review', 'done'],
  });

  useEffect(() => {
    onStateChange(state as CardState);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tracking specific fields intentionally, not the whole state object
  }, [state.column, state.priority, state.assignee, state.title, onStateChange]);

  return <div ref={aiRef as React.RefObject<HTMLDivElement>} />;
};

const CARD_DEFS: Array<{ id: string; description: string; initial: CardState }> = [
  {
    id: 'login-bug',
    description: 'Kanban card login bug',
    initial: { title: 'Login Bug', column: 'in-progress', priority: 'high', assignee: 'alice' },
  },
  {
    id: 'pwd-reset',
    description: 'Kanban card password reset',
    initial: { title: 'Password Reset', column: 'backlog', priority: 'medium', assignee: 'bob' },
  },
  {
    id: 'dash-charts',
    description: 'Kanban card dashboard charts',
    initial: { title: 'Dashboard Charts', column: 'review', priority: 'medium', assignee: 'carol' },
  },
  {
    id: 'mobile-nav',
    description: 'Kanban card mobile nav',
    initial: { title: 'Mobile Nav', column: 'backlog', priority: 'low', assignee: 'alice' },
  },
  {
    id: 'api-rate',
    description: 'Kanban card api rate limiting',
    initial: {
      title: 'API Rate Limiting',
      column: 'in-progress',
      priority: 'high',
      assignee: 'bob',
    },
  },
  {
    id: 'dark-mode',
    description: 'Kanban card dark mode',
    initial: { title: 'Dark Mode', column: 'backlog', priority: 'low', assignee: 'carol' },
  },
  {
    id: 'unit-tests',
    description: 'Kanban card unit tests',
    initial: { title: 'Unit Tests', column: 'done', priority: 'medium', assignee: 'dave' },
  },
  {
    id: 'ci-pipeline',
    description: 'Kanban card ci pipeline',
    initial: { title: 'CI Pipeline', column: 'review', priority: 'high', assignee: 'dave' },
  },
];

type CardStatesMap = Record<string, CardState>;

export const KanbanPage = () => {
  const [cardStates, setCardStates] = useState<CardStatesMap>(() =>
    Object.fromEntries(CARD_DEFS.map((c) => [c.id, c.initial])),
  );

  const makeOnStateChange = useCallback(
    (cardId: string) => (state: CardState) => {
      setCardStates((prev) => {
        const cur = prev[cardId];
        if (
          cur.column === state.column &&
          cur.priority === state.priority &&
          cur.assignee === state.assignee &&
          cur.title === state.title
        )
          return prev;
        return { ...prev, [cardId]: state };
      });
    },
    [],
  );

  return (
    <div style={{ padding: 32, fontFamily: 'monospace' }}>
      <h2 style={{ margin: '0 0 24px', fontSize: 20, fontWeight: 'bold', letterSpacing: -0.5 }}>
        Kanban Board
      </h2>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: 16,
          alignItems: 'start',
        }}
      >
        {COLUMNS.map((col) => {
          const cards = CARD_DEFS.filter((c) => cardStates[c.id].column === col);
          return (
            <div key={col}>
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  fontWeight: 'bold',
                  marginBottom: 12,
                  paddingBottom: 8,
                  borderBottom: '2px solid black',
                }}
              >
                {COLUMN_LABELS[col]}
                <span style={{ marginLeft: 8, fontWeight: 'normal', color: '#888' }}>
                  ({cards.length})
                </span>
              </div>
              <div style={{ minHeight: 60 }}>
                <AnimatePresence>
                  {cards.map((c) => {
                    const s = cardStates[c.id];
                    return (
                      <motion.div
                        key={c.id}
                        layout
                        initial={{ opacity: 0, y: -12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.22 }}
                        style={{
                          background: 'white',
                          border: '1px solid #ddd',
                          padding: 12,
                          marginBottom: 8,
                        }}
                      >
                        <div style={{ fontSize: 13, fontWeight: 'bold', marginBottom: 8 }}>
                          {s.title}
                        </div>
                        <div
                          style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              letterSpacing: 0.5,
                              textTransform: 'uppercase',
                              padding: '2px 6px',
                              ...PRIORITY_BADGE[s.priority],
                            }}
                          >
                            {s.priority}
                          </span>
                          <span style={{ fontSize: 11, color: '#888' }}>{s.assignee}</span>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'none' }}>
        {CARD_DEFS.map((c) => (
          <KanbanCard
            key={c.id}
            description={c.description}
            initialState={c.initial}
            onStateChange={makeOnStateChange(c.id)}
          />
        ))}
      </div>
    </div>
  );
};
