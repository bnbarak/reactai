import React, { createContext, useContext, useState } from 'react';

interface LoadingContextValue {
  loading: boolean;
  setLoading: (v: boolean) => void;
}

const LoadingContext = createContext<LoadingContextValue>({
  loading: false,
  setLoading: () => {},
});

interface LoadingProviderProps {
  children: React.ReactNode;
}

export const LoadingProvider = ({ children }: LoadingProviderProps) => {
  const [loading, setLoading] = useState(false);
  return (
    <LoadingContext.Provider value={{ loading, setLoading }}>{children}</LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);
