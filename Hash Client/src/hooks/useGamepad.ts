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
const BTN_TRIANGLE = 3; // PS △ / Xbox Y — toggles mute
const BTN_DPAD_UP = 12;
const BTN_DPAD_DOWN = 13;
const BTN_DPAD_LEFT = 14;
const BTN_DPAD_RIGHT = 15;

export function useGamepad(activeTab: TabId) {
  const { zone, navigate, setFocus, triggerSelect, triggerBack, setInputMode } = useFocus();
  const { toggleMute } = useMute();
  const lastInputAt = useRef(0);
  const rafId = useRef<number>(0);
  const prevButtons = useRef<boolean[]>([]);

  useEffect(() => {
    const poll = () => {
      const gp = navigator.getGamepads()[0];
      rafId.current = requestAnimationFrame(poll);

      if (!gp) return;

      const now = Date.now();
      const ready = now - lastInputAt.current > DEBOUNCE_MS;

      const btns = gp.buttons.map((b) => b.pressed);
      const axisX = gp.axes[0] ?? 0;
      const axisY = gp.axes[1] ?? 0;

      // Rising-edge detection (button just pressed this frame)
      const justPressed = (idx: number) => btns[idx] && !prevButtons.current[idx];

      let handled = false;

      if (ready) {
        // Directional input (stick OR d-pad)
        if (axisX < -DEADZONE || btns[BTN_DPAD_LEFT]) {
          setInputMode('gamepad');
          navigate(0, -1);
          handled = true;
        } else if (axisX > DEADZONE || btns[BTN_DPAD_RIGHT]) {
          setInputMode('gamepad');
          navigate(0, 1);
          handled = true;
        } else if (axisY < -DEADZONE || btns[BTN_DPAD_UP]) {
          setInputMode('gamepad');
          if (zone === 1) {
            const activeIdx = activeTab === 'search' ? 0 : ['home', 'shows', 'movies', 'games', 'myhash'].indexOf(activeTab) + 1;
            setFocus(0, activeIdx === -1 ? 1 : activeIdx);
          } else {
            navigate(-1, 0);
          }
          handled = true;
        } else if (axisY > DEADZONE || btns[BTN_DPAD_DOWN]) {
          setInputMode('gamepad');
          navigate(1, 0);
          handled = true;
        }

        // Action buttons (rising-edge only — fires once per press)
        if (justPressed(BTN_SELECT)) {
          setInputMode('gamepad');
          triggerSelect();
          handled = true;
        } else if (justPressed(BTN_BACK)) {
          setInputMode('gamepad');
          triggerBack();
          handled = true;
        } else if (justPressed(BTN_TRIANGLE)) {
          // △ / Y — toggle trailer mute (no debounce needed for toggle)
          toggleMute();
          handled = true;
        }

        if (handled) lastInputAt.current = now;
      }

      prevButtons.current = btns;
    };

    rafId.current = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(rafId.current);
  }, [navigate, triggerSelect, triggerBack, setInputMode, zone, activeTab, setFocus, toggleMute]);
}
