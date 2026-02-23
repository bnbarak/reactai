import React, { createContext, useContext, useState } from 'react';

export interface TurnRecord {
  turn: number;
  intent?: string;
  key?: string;
  patch?: Record<string, unknown>;
  success: boolean;
  error?: string;
}

interface DebugContextValue {
  turns: TurnRecord[];
  addTurn: (record: TurnRecord) => void;
  clearTurns: () => void;
}

const DebugContext = createContext<DebugContextValue>({
  turns: [],
  addTurn: () => {},
  clearTurns: () => {},
});

interface DebugProviderProps {
  children: React.ReactNode;
}

export const DebugProvider = ({ children }: DebugProviderProps) => {
  const [turns, setTurns] = useState<TurnRecord[]>([]);

  const addTurn = (record: TurnRecord) => setTurns((prev) => [...prev, record]);
  const clearTurns = () => setTurns([]);

  return (
    <DebugContext.Provider value={{ turns, addTurn, clearTurns }}>{children}</DebugContext.Provider>
  );
};

export const useDebug = () => useContext(DebugContext);
