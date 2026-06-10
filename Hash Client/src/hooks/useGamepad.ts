import { useEffect, useRef } from 'react';
import { useFocus } from '../context/FocusContext';
import { useMute } from '../context/MuteContext';
import type { TabId } from '../components/home/HomeNavbar';

const DEADZONE = 0.5;
const DEBOUNCE_MS = 170; // ms between repeated inputs

// Standard Gamepad API button indices — same for PS and Xbox in all browsers
// PS: Cross=0, Circle=1, Square=2, Triangle=3
// Xbox: A=0, B=1, X=2, Y=3
// D-pad: 12=Up, 13=Down, 14=Left, 15=Right
const BTN_SELECT = 0;
const BTN_BACK = 1;
const BTN_L1 = 4;
const BTN_R1 = 5;
const BTN_L2 = 6;
const BTN_R2 = 7;
const BTN_TRIANGLE = 3; // PS △ / Xbox Y — toggles mute
const BTN_DPAD_UP = 12;
const BTN_DPAD_DOWN = 13;
const BTN_DPAD_LEFT = 14;
const BTN_DPAD_RIGHT = 15;
const PLAYBACK_ZONE = 200;
const VOLUME_REPEAT_MS = 50;

export function useGamepad(activeTab: TabId) {
  const { zone, navigate, setFocus, triggerSelect, triggerBack, setInputMode } = useFocus();
  const { toggleMute, increaseVolume, decreaseVolume } = useMute();
  const lastInputAt = useRef(0);
  const lastVolumeAt = useRef(0); // Dedicated timer for volume repeat
  const rafId = useRef<number>(0);
  const prevButtons = useRef<boolean[]>([]);

  useEffect(() => {
    const poll = () => {
      const gamepads = navigator.getGamepads();
      let gp = null;
      for (const g of gamepads) {
        if (g) {
          gp = g;
          break;
        }
      }
      
      rafId.current = requestAnimationFrame(poll);
      if (!gp) return;

      const now = Date.now();
      const ready = now - lastInputAt.current > DEBOUNCE_MS;
      const volReady = now - lastVolumeAt.current > VOLUME_REPEAT_MS;

      const btns = gp.buttons.map((b) => b.pressed);
      const axisX = gp.axes[0] ?? 0;
      const axisY = gp.axes[1] ?? 0;

      // Rising-edge detection (button just pressed this frame)
      const justPressed = (idx: number) => btns[idx] && !prevButtons.current[idx];

      let handled = false;

      // Always allow global volume control via triggers
      // Using direct button state (btns[idx]) instead of justPressed to allow hold-to-repeat
      if (volReady) {
        if (btns[BTN_L2]) {
          decreaseVolume();
          lastVolumeAt.current = now;
          handled = true;
        } else if (btns[BTN_R2]) {
          increaseVolume();
          lastVolumeAt.current = now;
          handled = true;
        }
      }

      if (justPressed(BTN_TRIANGLE)) {
        toggleMute();
        handled = true;
      }

      if (ready && !handled) {
        // Directional input (stick OR d-pad)
        // Disable Stick Navigation in Playback Zone (so stick can be used as mouse)
        const isPlaybackActive = zone === PLAYBACK_ZONE;
        
        if (!isPlaybackActive && (axisX < -DEADZONE || btns[BTN_DPAD_LEFT])) {
          setInputMode('gamepad');
          navigate(0, -1);
          handled = true;
        } else if (!isPlaybackActive && (axisX > DEADZONE || btns[BTN_DPAD_RIGHT])) {
          setInputMode('gamepad');
          navigate(0, 1);
          handled = true;
        } else if (!isPlaybackActive && (axisY < -DEADZONE || btns[BTN_DPAD_UP])) {
          setInputMode('gamepad');
          if (zone === 1) {
            const activeIdx = activeTab === 'search' ? 0 : ['home', 'shows', 'movies', 'games', 'myhash'].indexOf(activeTab) + 1;
            setFocus(0, activeIdx === -1 ? 1 : activeIdx);
          } else {
            navigate(-1, 0);
          }
          handled = true;
        } else if (!isPlaybackActive && (axisY > DEADZONE || btns[BTN_DPAD_DOWN])) {
          setInputMode('gamepad');
          navigate(1, 0);
          handled = true;
        } else if (isPlaybackActive) {
           // In playback zone, only allow D-PAD for basic navigation (Back button)
           if (btns[BTN_DPAD_LEFT] || btns[BTN_DPAD_UP]) {
             setInputMode('gamepad');
             navigate(0, -1);
             handled = true;
           } else if (btns[BTN_DPAD_RIGHT] || btns[BTN_DPAD_DOWN]) {
             setInputMode('gamepad');
             navigate(0, 1);
             handled = true;
           }
        }

        // Player-specific mappings: keep the rest of the app behavior unchanged.
        if (zone === PLAYBACK_ZONE) {
          if (justPressed(BTN_SELECT)) {
            setInputMode('gamepad');
            triggerSelect(); // Restore standard select trigger
            handled = true;
          } else if (justPressed(BTN_BACK)) {
            setInputMode('gamepad');
            triggerBack();
            handled = true;
          } else if (justPressed(BTN_L1)) {
            setInputMode('gamepad');
            window.dispatchEvent(new CustomEvent('webview-seek', { detail: 'ArrowLeft' }));
            handled = true;
          } else if (justPressed(BTN_R1)) {
            setInputMode('gamepad');
            window.dispatchEvent(new CustomEvent('webview-seek', { detail: 'ArrowRight' }));
            handled = true;
          }
        } else {
          // Action buttons (rising-edge only — fires once per press)
          if (justPressed(BTN_SELECT)) {
            setInputMode('gamepad');
            triggerSelect();
            handled = true;
          } else if (justPressed(BTN_BACK)) {
            setInputMode('gamepad');
            triggerBack();
            handled = true;
          }
        }

        if (handled) lastInputAt.current = now;
      }

      prevButtons.current = btns;
    };

    rafId.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId.current);
  }, [navigate, triggerSelect, triggerBack, setInputMode, zone, activeTab, setFocus, toggleMute]);
}
