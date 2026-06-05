import React, { createContext, useCallback, useContext, useState } from 'react';

interface MuteContextType {
  muted: boolean;
  toggleMute: () => void;
}

const MuteContext = createContext<MuteContextType | null>(null);

export function MuteProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(true); // start muted

  const toggleMute = useCallback(() => setMuted((m) => !m), []);

  return (
    <MuteContext.Provider value={{ muted, toggleMute }}>
      {children}
    </MuteContext.Provider>
  );
}

export function useMute() {
  const ctx = useContext(MuteContext);
  if (!ctx) throw new Error('useMute must be used within MuteProvider');
  return ctx;
}
