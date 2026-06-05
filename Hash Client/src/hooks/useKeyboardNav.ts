import { useEffect } from 'react';
import { useFocus } from '../context/FocusContext';
import type { TabId } from '../components/home/HomeNavbar';

export function useKeyboardNav(activeTab: TabId) {
  const { zone, navigate, setFocus, triggerSelect, triggerBack, setInputMode } = useFocus();

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Never intercept when user is typing in a form field
      const tag = (e.target as HTMLElement)?.tagName;
      const editable = (e.target as HTMLElement)?.isContentEditable;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || editable) return;

      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          setInputMode('keyboard');
          if (zone === 1) {
            const activeIdx = activeTab === 'search' ? 0 : ['home', 'shows', 'movies', 'games', 'myhash'].indexOf(activeTab) + 1;
            setFocus(0, activeIdx === -1 ? 1 : activeIdx);
          } else {
            navigate(-1, 0);
          }
          break;
        case 'ArrowDown':
          e.preventDefault();
          setInputMode('keyboard');
          navigate(1, 0);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          setInputMode('keyboard');
          navigate(0, -1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          setInputMode('keyboard');
          navigate(0, 1);
          break;
        case 'Enter':
          e.preventDefault();
          setInputMode('keyboard');
          triggerSelect();
          break;
        case 'Backspace':
          e.preventDefault();
          setInputMode('keyboard');
          triggerBack();
          break;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [navigate, triggerSelect, triggerBack, setInputMode, zone, activeTab, setFocus]);
}
