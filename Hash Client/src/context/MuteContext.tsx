import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';

interface MuteContextType {
  muted: boolean;
  toggleMute: () => void;
  volume: number;
  setVolume: (v: number) => void;
  increaseVolume: () => void;
  decreaseVolume: () => void;
  showVolumeOverlay: boolean;
}

const MuteContext = createContext<MuteContextType | null>(null);

export function MuteProvider({ children }: { children: React.ReactNode }) {
  const [muted, setMuted] = useState(true); // start muted
  const [volume, setVolumeState] = useState(1); // 1.0 = 100%
  const [showVolumeOverlay, setShowVolumeOverlay] = useState(false);

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      setShowVolumeOverlay(true);
      return next;
    });
  }, []);

  const setVolume = useCallback((v: number) => {
    setVolumeState((prev) => {
      const next = Math.max(0, Math.min(1, v));
      if (next !== prev) {
        setMuted(false);
        setShowVolumeOverlay(true);
      }
      return next;
    });
  }, []);

  const increaseVolume = useCallback(() => {
    setVolumeState((prev) => {
      const next = Math.max(0, Math.min(1, prev + 0.05));
      if (next !== prev) {
        setMuted(false);
        setShowVolumeOverlay(true);
      }
      return next;
    });
  }, []);

  const decreaseVolume = useCallback(() => {
    setVolumeState((prev) => {
      const next = Math.max(0, Math.min(1, prev - 0.05));
      if (next !== prev) {
        setMuted(false);
        setShowVolumeOverlay(true);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (showVolumeOverlay) {
      const timer = setTimeout(() => setShowVolumeOverlay(false), 2000);
      return () => clearTimeout(timer);
    }
  }, [volume, showVolumeOverlay]);

  return (
    <MuteContext.Provider value={{ muted, toggleMute, volume, setVolume, increaseVolume, decreaseVolume, showVolumeOverlay }}>
      {children}
    </MuteContext.Provider>
  );
}

export function useMute() {
  const ctx = useContext(MuteContext);
  if (!ctx) throw new Error('useMute must be used within MuteProvider');
  return ctx;
}
