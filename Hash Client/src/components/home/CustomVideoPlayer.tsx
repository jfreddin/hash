import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useFocus } from '../../context/FocusContext';
import { useMute } from '../../context/MuteContext';
import { useGamepad } from '../../hooks/useGamepad';
import { useKeyboardNav } from '../../hooks/useKeyboardNav';
import {
  enterPlayerShell,
  exitPlayerShell,
  focusPlayerShell,
  isElectronPlayerAvailable,
  onPlayerShellBack,
} from '../../utils/electronPlayer';

const PLAYBACK_ZONE = 200;

function getPlayerRelativePoint(host: HTMLElement, windowX: number, windowY: number) {
  const rect = host.getBoundingClientRect();
  return {
    x: Math.max(0, Math.min(rect.width, windowX - rect.left)),
    y: Math.max(0, Math.min(rect.height, windowY - rect.top)),
  };
}

function getPlayerCenter(host: HTMLElement) {
  const rect = host.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}

interface CustomVideoPlayerProps {
  movie: any;
  season?: number;
  episode?: number;
  onClose: () => void;
  onPlayNextEpisode?: (movie: any, nextSeason: number, nextEpisode: number) => void;
}

function getDirectCinebyUrl(movie: any, season?: number, episode?: number): string | null {
  if (!movie) return null;
  const candidates = [
    movie?.cineby_url,
    movie?.cinebyUrl,
    movie?.watch_url,
    movie?.watchUrl,
    movie?.player_url,
    movie?.playerUrl,
    movie?.source_url,
    movie?.sourceUrl,
  ];

  for (const candidate of candidates) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    try {
      const url = new URL(candidate);
      if (!url.hostname.endsWith('cineby.vg')) continue;
      if (!url.pathname.startsWith('/watch/')) continue;
      if (season !== undefined && season !== null && !url.searchParams.has('s')) {
        url.searchParams.set('s', String(season));
      }
      if (episode !== undefined && episode !== null && !url.searchParams.has('e')) {
        url.searchParams.set('e', String(episode));
      }
      return url.toString();
    } catch {
      continue;
    }
  }

  return null;
}

function buildFallbackVideasyUrl(movie: any, season?: number, episode?: number): string {
  const isSeriesLocal = movie?.type === 'show' || !!(movie?.episodes && movie.episodes.length > 0);
  const tmdbId = movie?.id || movie?._id || 'unknown';
  const params = new URLSearchParams({
    color: 'E50914',
    nextEpisode: 'true',
    episodeSelector: 'true',
    autoplay: 'true',
    autoPlay: '1',
  });

  if (isSeriesLocal) {
    return `https://player.videasy.net/tv/${tmdbId}/${season ?? 1}/${episode ?? 1}?${params.toString()}`;
  }

  return `https://player.videasy.net/movie/${tmdbId}?${params.toString()}`;
}

function getWebviewContentsId(wv: any): number | null {
  try {
    return wv.getWebContentsId?.() ?? null;
  } catch {
    return null;
  }
}

function sendToWebview(ipc: any, channel: string, ...args: unknown[]) {
  ipc.send(channel, ...args);
}

export function CustomVideoPlayer({
  movie,
  season,
  episode,
  onClose,
}: CustomVideoPlayerProps) {
  const { zone, item, selectCount, backCount, registerZone, unregisterZone, setFocus } = useFocus();
  const { volume, muted } = useMute();
  const webviewRef = useRef<any>(null);
  const playerHostRef = useRef<HTMLDivElement>(null);
  const playerReadyRef = useRef(false);
  const playerInitRef = useRef(false);
  const contentsIdRef = useRef<number | null>(null);
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playerError, setPlayerError] = useState<string | null>(null);
  const prevSelect = useRef(selectCount);
  const prevBack = useRef(backCount);

  const initialX = window.innerWidth / 2;
  const initialY = window.innerHeight / 2;
  const [cursorPos, setCursorPos] = useState({ x: initialX, y: initialY });
  const [cursorVisible, setCursorVisible] = useState(false);

  const cursorRef = useRef({ x: initialX, y: initialY });
  const cursorHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevSquare = useRef(false);

  useEffect(() => {
    cursorRef.current = cursorPos;
  }, [cursorPos]);

  useEffect(() => {
    if (isNaN(cursorPos.x) || isNaN(cursorPos.y)) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setCursorPos({ x: cx, y: cy });
    }
  }, [cursorPos]);

  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    focusPlayerShell();
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 5000);
  }, []);

  useGamepad('home');
  useKeyboardNav('home');

  const resetCursorTimer = useCallback(() => {
    setCursorVisible(true);
    if (cursorHideTimerRef.current) clearTimeout(cursorHideTimerRef.current);
    cursorHideTimerRef.current = setTimeout(() => {
      setCursorVisible(false);
    }, 2000);
  }, []);

  const getIpc = useCallback(() => {
    const win = window as any;
    return win.require?.('electron')?.ipcRenderer ?? null;
  }, []);

  const webviewExecute = useCallback((script: string) => {
    const wv = webviewRef.current;
    if (!wv) return;
    try { wv.executeJavaScript(script); } catch {}
  }, []);

  const webviewSendInput = useCallback((cx: number, cy: number) => {
    const ipc = getIpc();
    if (!ipc) return;
    const send = () => {
      const cid = contentsIdRef.current;
      if (cid == null) return false;
      sendToWebview(ipc, 'force-webview-click-at', cid, Math.round(cx), Math.round(cy));
      return true;
    };
    if (!send()) {
      let tries = 0;
      const retry = setInterval(() => {
        if (send() || ++tries > 20) clearInterval(retry);
      }, 250);
    }
  }, [getIpc]);

  const webviewSendMouseMove = useCallback((cx: number, cy: number) => {
    const ipc = getIpc();
    if (!ipc) return;
    const cid = contentsIdRef.current;
    if (cid == null) return;
    sendToWebview(ipc, 'force-webview-mousemove', cid, Math.round(cx), Math.round(cy));
  }, [getIpc]);

  const webviewSendKey = useCallback((keyCode: string) => {
    const ipc = getIpc();
    if (!ipc) return;
    const send = () => {
      const cid = contentsIdRef.current;
      if (cid == null) return false;
      sendToWebview(ipc, 'send-webview-key', cid, keyCode);
      return true;
    };
    if (!send()) {
      let tries = 0;
      const retry = setInterval(() => {
        if (send() || ++tries > 20) clearInterval(retry);
      }, 250);
    }
  }, [getIpc]);

  useEffect(() => {
    if (!muted && volume > 0) {
      webviewExecute(`
        (function syncVolume(root) {
          const vol = ${volume};
          Array.from(root.querySelectorAll("video, audio")).forEach(m => { m.volume = vol; m.muted = false; });
          Array.from(root.querySelectorAll("iframe")).forEach(f => {
            try { if (f.contentDocument) syncVolume(f.contentDocument); } catch(e) {}
          });
        })(document);
      `);
    } else {
      webviewExecute(`
        (function muteAll(root) {
          Array.from(root.querySelectorAll("video, audio")).forEach(m => { m.muted = true; m.volume = 0; });
          Array.from(root.querySelectorAll("iframe")).forEach(f => {
            try { if (f.contentDocument) muteAll(f.contentDocument); } catch(e) {}
          });
        })(document);
      `);
    }
  }, [volume, muted, webviewExecute]);

  useEffect(() => {
    const handleSeek = (e: Event) => {
      const keyCode = (e as CustomEvent).detail;
      const skip = keyCode === 'ArrowRight' ? 10 : -10;
      webviewExecute(`
        Array.from(document.querySelectorAll("video")).forEach(v => {
          if (v.duration) v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + ${skip}));
        });
      `);
      resetHideTimer();
    };
    window.addEventListener('webview-seek', handleSeek);
    return () => window.removeEventListener('webview-seek', handleSeek);
  }, [resetHideTimer, webviewExecute]);

  useEffect(() => {
    let rafId: number;
    const pollCursor = () => {
      const gamepads = navigator.getGamepads();
      for (const gp of gamepads) {
        if (!gp) continue;
        const axisX = gp.axes[0] ?? 0;
        const axisY = gp.axes[1] ?? 0;

        if (Math.abs(axisX) > 0.1 || Math.abs(axisY) > 0.1) {
          const moveSpeed = 15;
          const nextX = Math.max(0, Math.min(window.innerWidth, cursorRef.current.x + axisX * moveSpeed));
          const nextY = Math.max(0, Math.min(window.innerHeight, cursorRef.current.y + axisY * moveSpeed));

          cursorRef.current = { x: nextX, y: nextY };
          setCursorPos({ x: nextX, y: nextY });
          setCursorVisible(true);
          resetCursorTimer();
          resetHideTimer();

          const host = playerHostRef.current;
          if (host) {
            const rel = getPlayerRelativePoint(host, cursorRef.current.x, cursorRef.current.y);
            webviewSendMouseMove(rel.x, rel.y);
          }
        }

        const squarePressed = gp.buttons[2]?.pressed;
        if (squarePressed && !prevSquare.current) {
          const host = playerHostRef.current;
          if (host) {
            const rel = getPlayerRelativePoint(host, cursorRef.current.x, cursorRef.current.y);
            webviewSendInput(rel.x, rel.y);
            resetCursorTimer();
            resetHideTimer();
          }
        }
        prevSquare.current = squarePressed;
        break;
      }
      rafId = requestAnimationFrame(pollCursor);
    };
    rafId = requestAnimationFrame(pollCursor);
    return () => cancelAnimationFrame(rafId);
  }, [resetCursorTimer, resetHideTimer, webviewSendInput, webviewSendMouseMove]);

  useEffect(() => {
    const win = window as any;
    if (!win.require) return;
    const { ipcRenderer } = win.require('electron');
    ipcRenderer.send('playback-power-save-start');
    return () => ipcRenderer.send('playback-power-save-stop');
  }, []);

  useEffect(() => {
    const heartbeat = setInterval(() => {
      const host = playerHostRef.current;
      if (!host) return;
      const center = getPlayerCenter(host);
      webviewSendMouseMove(
        center.x + (Math.random() > 0.5 ? 1 : -1),
        center.y + (Math.random() > 0.5 ? 1 : -1),
      );
    }, 1500);
    return () => clearInterval(heartbeat);
  }, [webviewSendMouseMove]);

  const executeSmartPlay = useCallback(() => {
    const host = playerHostRef.current;
    if (!host) return;
    const center = getPlayerCenter(host);
    webviewSendInput(center.x, center.y);
  }, [webviewSendInput]);

  const clickPlayerCenter = useCallback(() => {
    executeSmartPlay();
  }, [executeSmartPlay]);

  useEffect(() => {
    const handleActivity = () => resetHideTimer();
    window.addEventListener('mousemove', handleActivity);
    return () => {
      window.removeEventListener('mousemove', handleActivity);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  const isSeriesLocal = movie?.type === 'show' || !!(movie?.episodes && movie.episodes.length > 0);

  useEffect(() => {
    let cancelled = false;
    setPlaybackUrl(null);
    setIsLoading(true);
    setPlayerError(null);

    const resolvePlaybackUrl = async () => {
      const directUrl = getDirectCinebyUrl(movie, season, episode);
      if (directUrl) {
        if (!cancelled) setPlaybackUrl(directUrl);
        return;
      }

      if (!cancelled) {
        setPlaybackUrl(buildFallbackVideasyUrl(movie, season, episode));
      }
    };

    resolvePlaybackUrl();
    return () => { cancelled = true; };
  }, [movie, season, episode, isSeriesLocal]);

  useEffect(() => {
    registerZone(PLAYBACK_ZONE, 2);
    setFocus(PLAYBACK_ZONE, 0, 'gamepad');
    focusPlayerShell();
    return () => unregisterZone(PLAYBACK_ZONE);
  }, [registerZone, unregisterZone, setFocus]);

  useEffect(() => {
    const handleShellBack = () => {
      if (controlsVisible) onClose();
      else resetHideTimer();
    };
    return onPlayerShellBack(handleShellBack);
  }, [onClose, controlsVisible, resetHideTimer]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Backspace') {
        event.preventDefault();
        event.stopPropagation();
        if (controlsVisible) onClose();
        else resetHideTimer();
      }
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose, controlsVisible, resetHideTimer]);

  useEffect(() => {
    const handlePlayerKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' || event.key === 'Backspace') return;

      const keyMap: Record<string, string> = {
        ' ': 'Space',
        'ArrowLeft': 'ArrowLeft',
        'ArrowRight': 'ArrowRight',
        'ArrowUp': 'ArrowUp',
        'ArrowDown': 'ArrowDown',
        'Enter': 'Enter',
        'f': 'f',
        'F': 'f',
        'm': 'm',
        'M': 'm',
      };

      const mappedKey = keyMap[event.key];
      if (mappedKey) {
        event.preventDefault();
        event.stopPropagation();
        webviewSendKey(mappedKey);
        resetHideTimer();
      }
    };
    window.addEventListener('keydown', handlePlayerKey, true);
    return () => window.removeEventListener('keydown', handlePlayerKey, true);
  }, [resetHideTimer, webviewSendKey]);

  useEffect(() => {
    if (selectCount <= prevSelect.current) return;
    prevSelect.current = selectCount;
    if (zone === PLAYBACK_ZONE) {
      if (item === 0) {
        if (controlsVisible) onClose();
        else resetHideTimer();
      } else if (item === 1) {
        clickPlayerCenter();
        resetHideTimer();
      }
    }
  }, [selectCount, zone, item, onClose, controlsVisible, resetHideTimer, clickPlayerCenter]);

  useEffect(() => {
    if (backCount <= prevBack.current) return;
    prevBack.current = backCount;
    if (controlsVisible) onClose();
    else resetHideTimer();
  }, [backCount, onClose, controlsVisible, resetHideTimer]);

  useEffect(() => {
    if (!isElectronPlayerAvailable()) {
      setPlayerError('Video playback requires the Electron desktop app.');
      setIsLoading(false);
      return;
    }

    if (!playbackUrl) return;

    playerReadyRef.current = false;
    playerInitRef.current = false;
    contentsIdRef.current = null;

    document.documentElement.classList.add('player-active');
    document.body.classList.add('player-active');
    enterPlayerShell();
  }, [playbackUrl]);

  const onWebviewReady = useCallback((wv: any) => {
    if (playerReadyRef.current) return;
    playerReadyRef.current = true;
    console.log('[Player] Video engine ready.');
    setIsLoading(false);
    focusPlayerShell();

    wv.executeJavaScript(`
      (function keepPlayerAwake() {
        if (window.__hashKeepAlive) return;
        window.__hashKeepAlive = true;

        function dispatch(el, cx, cy) {
          if (!el) return;
          try {
            el.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientX: cx, clientY: cy }));
            el.dispatchEvent(new PointerEvent('pointermove', { bubbles: true, clientX: cx, clientY: cy }));
            el.dispatchEvent(new PointerEvent('pointerover', { bubbles: true, clientX: cx, clientY: cy }));
            el.dispatchEvent(new Event('mousemove', { bubbles: true }));
          } catch (e) {}
        }

        setInterval(() => {
          const cx = Math.round(window.innerWidth / 2);
          const cy = Math.round(window.innerHeight / 2);
          const sels = ['video', '.jw-video', '.jw-view', '.jw-controlbar',
            '.vjs-tech', '.vjs-control-bar', '.video-js',
            '.plyr', '.plyr__video', '.plyr__controls',
            '#player', '.player-container', '.video-player',
            document.body, document.documentElement];
          for (const s of sels) {
            try {
              const els = typeof s === 'string' ? document.querySelectorAll(s) : [s];
              els.forEach(el => { if (el) dispatch(el, cx, cy); });
            } catch (e) {}
          }
        }, 1500);
      })();
    `).catch(() => {});

    setTimeout(() => {
      const host = playerHostRef.current;
      if (!host) return;
      const center = getPlayerCenter(host);
      webviewSendInput(center.x, center.y);
      // Retry click a few times in case the player wasn't ready on first click
      setTimeout(() => webviewSendInput(center.x, center.y), 500);
      setTimeout(() => webviewSendInput(center.x, center.y), 1500);
    }, 200);
  }, [webviewSendInput]);

  const startPollingVideoEngine = useCallback((wv: any) => {
    if (playerInitRef.current) return;
    playerInitRef.current = true;

    console.log('[Player] <webview> DOM ready. Polling for video engine...');

    const tryGetContentsId = (attempts = 0) => {
      try {
        const cid = getWebviewContentsId(wv);
        if (cid != null) {
          contentsIdRef.current = cid;
          console.log('[Player] webview contentsId:', cid);
          return;
        }
      } catch (e) {}
      if (attempts < 20) {
        setTimeout(() => tryGetContentsId(attempts + 1), 250);
      } else {
        console.warn('[Player] Could not get webview contentsId after retries');
      }
    };
    tryGetContentsId();

    const checkReady = () => {
      wv.executeJavaScript(`
        !!(document.querySelector('video') ||
           document.querySelector('.jw-video') ||
           document.querySelector('.vjs-tech') ||
           document.querySelector('iframe'));
      `).then((ready: boolean) => {
        if (ready) {
          onWebviewReady(wv);
        } else {
          setTimeout(checkReady, 200);
        }
      }).catch(() => {
        setTimeout(checkReady, 500);
      });
    };

    setTimeout(checkReady, 300);
  }, [onWebviewReady]);

  // Attach webview DOM events via useEffect (React props don't support Electron webview events)
  useEffect(() => {
    const wv = webviewRef.current;
    if (!wv) return;

    const onDidStopLoading = () => {
      console.log('[Player] webview did-stop-loading');
      startPollingVideoEngine(wv);
    };

    const onDidFailLoad = (_event: any, errorCode: number, errorDescription: string) => {
      console.error(`[Player] webview did-fail-load (${errorCode}): ${errorDescription}`);
      if (!playerReadyRef.current) {
        setPlayerError(`Player load failed: ${errorDescription}`);
        setIsLoading(false);
      }
    };

    const onDomReady = () => {
      console.log('[Player] webview dom-ready');
      startPollingVideoEngine(wv);
    };

    wv.addEventListener('did-stop-loading', onDidStopLoading);
    wv.addEventListener('did-fail-load', onDidFailLoad);
    wv.addEventListener('dom-ready', onDomReady);

    // Try immediately if already loaded
    try {
      if (!wv.isLoading() && wv.getURL()) {
        console.log('[Player] webview already loaded, starting immediately');
        startPollingVideoEngine(wv);
      }
    } catch {}

    // Safety: start polling 3s after mount regardless of events
    const safetyTimer = setTimeout(() => {
      startPollingVideoEngine(wv);
    }, 3000);

    return () => {
      clearTimeout(safetyTimer);
      wv.removeEventListener('did-stop-loading', onDidStopLoading);
      wv.removeEventListener('did-fail-load', onDidFailLoad);
      wv.removeEventListener('dom-ready', onDomReady);
    };
  }, [playbackUrl, startPollingVideoEngine]);

  if (!movie) return null;

  return (
    <div className="fixed inset-0 z-200 text-white overflow-hidden" style={{ pointerEvents: 'none' }}>
      {/* Webview layer — z-index: 1, below React overlay */}
      {playbackUrl && (
        <webview
          ref={webviewRef}
          src={playbackUrl}
          webpreferences="contextIsolation=no, webSecurity=no, backgroundThrottling=false"
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            zIndex: 1,
            border: 'none',
            backgroundColor: '#000',
            pointerEvents: 'auto',
          }}
        />
      )}

      {/* Coordinate host for mapping cursor → webview-relative coords */}
      <div ref={playerHostRef} className="absolute inset-0" style={{ zIndex: 2 }} aria-hidden />

      {/* Loading overlay — z-index: 10 */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4 pointer-events-none"
            style={{ zIndex: 10 }}
          >
            <Loader2 className="w-12 h-12 text-red-600 animate-spin" />
            <p className="text-white/60 font-medium animate-pulse">Loading Video...</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error overlay — z-index: 10 */}
      {playerError && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center bg-black gap-4 pointer-events-auto"
          style={{ zIndex: 10 }}
        >
          <p className="text-white/80 font-medium">{playerError}</p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-full bg-white text-black font-semibold"
          >
            Back to Browse
          </button>
        </div>
      )}

      {/* Gamepad cursor — z-index: 50 */}
      <AnimatePresence>
        {cursorVisible && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute w-6 h-6 border-[3px] border-white bg-black/30 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] pointer-events-none"
            style={{
              zIndex: 50,
              left: cursorPos.x - 12,
              top: cursorPos.y - 12,
            }}
          />
        )}
      </AnimatePresence>

      {/* Back button — z-index: 30 */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.button
            key="back-button"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            onMouseEnter={() => setFocus(PLAYBACK_ZONE, 0, 'mouse')}
            className={`absolute top-7 left-8 flex items-center gap-3 px-5 py-2.5 rounded-full border transition-all pointer-events-auto ${zone === PLAYBACK_ZONE && item === 0
              ? 'bg-white text-black border-white scale-105 shadow-lg'
              : 'bg-black/55 text-white border-white/20 hover:bg-black/75 hover:border-white/40'
              }`}
            style={{
              zIndex: 30,
              outline: zone === PLAYBACK_ZONE && item === 0 ? '2px solid white' : 'none',
              outlineOffset: '3px',
            }}
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="font-semibold text-[15px]">Back to Browse</span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Controller guides — z-index: 40 */}
      <AnimatePresence>
        {controlsVisible && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.4 }}
            className="absolute top-8 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-5 py-3 rounded-2xl border border-white/10 shadow-xl flex items-center gap-5 pointer-events-none"
            style={{ zIndex: 40 }}
          >
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-blue-500/20 border border-blue-400/40 flex items-center justify-center text-blue-400 font-bold text-xs">X</span>
              <span className="text-xs font-medium text-white/80">Play</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/60 font-bold text-[9px] tracking-tight">L1</span>
              <span className="text-xs font-medium text-white/80">Seek</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white/60 font-bold text-[9px] tracking-tight">L2</span>
              <span className="text-xs font-medium text-white/80">Volume</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-green-500/20 border border-green-400/40 flex items-center justify-center text-green-400 font-bold text-sm leading-none">△</span>
              <span className="text-xs font-medium text-white/80">Mute</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
                <div className="w-2 h-2 rounded-full bg-white/50" />
              </span>
              <span className="text-xs font-medium text-white/80">Mouse</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-7 h-7 rounded-md bg-pink-500/20 border border-pink-400/40 flex items-center justify-center text-pink-400 font-bold text-sm leading-none">□</span>
              <span className="text-xs font-medium text-white/80">Click</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
