import React, { createContext, useContext, useReducer, useCallback } from 'react';

export type InputMode = 'mouse' | 'keyboard' | 'gamepad';

interface FocusState {
  zone: number;
  item: number;
  inputMode: InputMode;
  selectCount: number;
  backCount: number;
  zoneMaxItems: Record<number, number>;
  zoneItemMemory: Record<number, number>;
}

type FocusAction =
  | { type: 'SET_FOCUS'; zone: number; item: number; inputMode?: InputMode }
  | { type: 'NAVIGATE'; dz: number; di: number }
  | { type: 'SET_INPUT_MODE'; mode: InputMode }
  | { type: 'SELECT' }
  | { type: 'BACK' }
  | { type: 'REGISTER_ZONE'; zone: number; max: number }
  | { type: 'UNREGISTER_ZONE'; zone: number };

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

function getNextItemDetail(current: string, dir: string, isSeries: boolean): string {
  switch (current) {
    case 'back':
      if (dir === 'down') return 'thumbs-up';
      if (dir === 'right') return 'mute';
      break;
    case 'thumbs-up':
      if (dir === 'up') return 'back';
      if (dir === 'down') return 'play';
      if (dir === 'right') return 'thumbs-down';
      break;
    case 'thumbs-down':
      if (dir === 'up') return 'back';
      if (dir === 'down') return 'play';
      if (dir === 'left') return 'thumbs-up';
      if (dir === 'right') return 'mute';
      break;
    case 'play':
      if (dir === 'up') return 'thumbs-up';
      if (dir === 'down') return isSeries ? 'episodes' : 'more-like-this';
      if (dir === 'right') return 'mute';
      break;
    case 'episodes':
      if (dir === 'up') return 'play';
      if (dir === 'down') return 'more-like-this';
      if (dir === 'right') return 'mute';
      break;
    case 'more-like-this':
      if (dir === 'up') return isSeries ? 'episodes' : 'play';
      if (dir === 'down' || dir === 'right') return 'mute';
      break;
    case 'mute':
      if (dir === 'left') return 'more-like-this';
      if (dir === 'up') return 'thumbs-down';
      break;
  }
  return current;
}

function focusReducer(state: FocusState, action: FocusAction): FocusState {
  switch (action.type) {
    case 'SET_FOCUS':
      return {
        ...state,
        zone: action.zone,
        item: action.item,
        inputMode: action.inputMode ?? state.inputMode,
        zoneItemMemory: { ...state.zoneItemMemory, [action.zone]: action.item },
      };

    case 'NAVIGATE': {
      const { dz, di } = action;

      // Custom navigation inside Playback view (zone 200)
      if (state.zone === 200) {
        let nextItem = state.item;
        if (dz === -1 || di === -1) nextItem = 0; // Up or Left -> Back button
        else if (dz === 1 || di === 1) nextItem = 1; // Down or Right -> Player
        
        if (nextItem !== state.item) {
          return {
            ...state,
            item: nextItem,
            zoneItemMemory: { ...state.zoneItemMemory, [200]: nextItem },
          };
        }
        return state;
      }

      // Custom 2D grid navigation inside Movie Details (zone 100)
      if (state.zone === 100) {
        const isSeries = state.zoneMaxItems[100] === 7;
        const items = isSeries
          ? ['back', 'play', 'episodes', 'more-like-this', 'thumbs-up', 'thumbs-down', 'mute']
          : ['back', 'play', 'more-like-this', 'thumbs-up', 'thumbs-down', 'mute'];
        const currentItem = items[state.item] || 'play';
        let dir = '';
        if (dz === -1) dir = 'up';
        else if (dz === 1) dir = 'down';
        else if (di === -1) dir = 'left';
        else if (di === 1) dir = 'right';

        if (!dir) return state;
        const nextItemName = getNextItemDetail(currentItem, dir, isSeries);
        const nextIdx = items.indexOf(nextItemName);
        if (nextIdx !== -1 && nextIdx !== state.item) {
          return {
            ...state,
            item: nextIdx,
            zoneItemMemory: { ...state.zoneItemMemory, [100]: nextIdx },
          };
        }
        return state;
      }

      // Custom navigation inside Seasons List (zone 101)
      if (state.zone === 101) {
        let nextItem = state.item;
        if (dz === -1) { // Up
          nextItem = Math.max(0, state.item - 1);
        } else if (dz === 1) { // Down
          nextItem = Math.min((state.zoneMaxItems[101] ?? 1) - 1, state.item + 1);
        } else if (di === 1) { // Right
          // Switch to Episodes (zone 102) if we have episodes registered
          if (state.zoneMaxItems[102] && state.zoneMaxItems[102] > 0) {
            return {
              ...state,
              zone: 102,
              item: 0,
            };
          }
        }
        if (nextItem !== state.item) {
          return {
            ...state,
            item: nextItem,
            zoneItemMemory: { ...state.zoneItemMemory, [101]: nextItem },
          };
        }
        return state;
      }

      // Custom navigation inside Episodes List (zone 102)
      if (state.zone === 102) {
        let nextItem = state.item;
        if (dz === -1) { // Up
          nextItem = Math.max(0, state.item - 1);
        } else if (dz === 1) { // Down
          nextItem = Math.min((state.zoneMaxItems[102] ?? 1) - 1, state.item + 1);
        } else if (di === -1) { // Left
          // Switch back to Seasons (zone 101)
          return {
            ...state,
            zone: 101,
            item: Math.min(state.zoneItemMemory[101] ?? 1, (state.zoneMaxItems[101] ?? 2) - 1),
          };
        }
        if (nextItem !== state.item) {
          return {
            ...state,
            item: nextItem,
            zoneItemMemory: { ...state.zoneItemMemory, [102]: nextItem },
          };
        }
        return state;
      }

      const allZones = Object.keys(state.zoneMaxItems).map(Number);
      if (allZones.length === 0) return state;

      const maxZone = Math.max(...allZones);
      const newZone = clamp(state.zone + dz, 0, maxZone);
      const maxItemsInNewZone = (state.zoneMaxItems[newZone] ?? 1) - 1;

      let newItem: number;
      const newMemory = { ...state.zoneItemMemory };

      if (dz !== 0) {
        // Zone change: restore item index from memory for the new zone
        newItem = Math.min(state.zoneItemMemory[newZone] ?? 0, maxItemsInNewZone);
      } else {
        // Same zone: move item, clamped (no wrap)
        newItem = clamp(state.item + di, 0, maxItemsInNewZone);
        // Save to memory
        newMemory[newZone] = newItem;
      }

      return { ...state, zone: newZone, item: newItem, zoneItemMemory: newMemory };
    }

    case 'SET_INPUT_MODE':
      return { ...state, inputMode: action.mode };

    case 'SELECT':
      return { ...state, selectCount: state.selectCount + 1 };

    case 'BACK':
      return { ...state, backCount: state.backCount + 1 };

    case 'REGISTER_ZONE':
      return {
        ...state,
        zoneMaxItems: { ...state.zoneMaxItems, [action.zone]: action.max },
      };

    case 'UNREGISTER_ZONE': {
      const next = { ...state.zoneMaxItems };
      delete next[action.zone];
      return { ...state, zoneMaxItems: next };
    }

    default:
      return state;
  }
}

interface FocusContextType {
  zone: number;
  item: number;
  zoneItemMemory: Record<number, number>;
  inputMode: InputMode;
  selectCount: number;
  backCount: number;
  isFocused: (z: number, i: number) => boolean;
  isZoneFocused: (z: number) => boolean;
  setFocus: (z: number, i: number, mode?: InputMode) => void;
  navigate: (dz: number, di: number) => void;
  setInputMode: (mode: InputMode) => void;
  triggerSelect: () => void;
  triggerBack: () => void;
  registerZone: (z: number, max: number) => void;
  unregisterZone: (z: number) => void;
}

const FocusContext = createContext<FocusContextType | null>(null);

const initialState: FocusState = {
  zone: 1, // Start on hero
  item: 0,
  inputMode: 'mouse',
  selectCount: 0,
  backCount: 0,
  zoneMaxItems: {
    0: 7, // Navbar: Search, Home, Shows, Movies, Games, My HASH, Logout
    1: 2, // Hero: Play, More Info
  },
  zoneItemMemory: {
    0: 1, // Default navbar to 'Home'
    1: 0, // Default hero to 'Play'
  },
};

export function FocusProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(focusReducer, initialState);

  const isFocused = useCallback(
    (z: number, i: number) => state.zone === z && state.item === i,
    [state.zone, state.item]
  );
  const isZoneFocused = useCallback((z: number) => state.zone === z, [state.zone]);
  const setFocus = useCallback(
    (z: number, i: number, mode?: InputMode) =>
      dispatch({ type: 'SET_FOCUS', zone: z, item: i, inputMode: mode }),
    []
  );
  const navigate = useCallback(
    (dz: number, di: number) => dispatch({ type: 'NAVIGATE', dz, di }),
    []
  );
  const setInputMode = useCallback(
    (mode: InputMode) => dispatch({ type: 'SET_INPUT_MODE', mode }),
    []
  );
  const triggerSelect = useCallback(() => dispatch({ type: 'SELECT' }), []);
  const triggerBack = useCallback(() => dispatch({ type: 'BACK' }), []);
  const registerZone = useCallback(
    (z: number, max: number) => dispatch({ type: 'REGISTER_ZONE', zone: z, max }),
    []
  );
  const unregisterZone = useCallback(
    (z: number) => dispatch({ type: 'UNREGISTER_ZONE', zone: z }),
    []
  );

  return (
    <FocusContext.Provider
      value={{
        ...state,
        isFocused,
        isZoneFocused,
        setFocus,
        navigate,
        setInputMode,
        triggerSelect,
        triggerBack,
        registerZone,
        unregisterZone,
      }}
    >
      {children}
    </FocusContext.Provider>
  );
}

export function useFocus() {
  const ctx = useContext(FocusContext);
  if (!ctx) throw new Error('useFocus must be used within FocusProvider');
  return ctx;
}
