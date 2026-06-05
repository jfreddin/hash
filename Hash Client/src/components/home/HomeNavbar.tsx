import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, ChevronDown, LogOut } from 'lucide-react';
import { useFocus } from '../../context/FocusContext';

export type TabId = 'search' | 'home' | 'shows' | 'movies' | 'games' | 'myhash';

const NAV_TABS: { id: Exclude<TabId, 'search'>; label: string }[] = [
  { id: 'home',   label: 'Home' },
  { id: 'shows',  label: 'Shows' },
  { id: 'movies', label: 'Movies' },
  { id: 'games',  label: 'Games' },
  { id: 'myhash', label: 'My HASH' },
];

const ZONE = 0;

interface HomeNavbarProps {
  activeTab: TabId;
  onTabChange: (tab: TabId) => void;
  user: any;
  onLogout: () => void;
  scrolled: boolean;
}

export function HomeNavbar({ activeTab, onTabChange, user, onLogout, scrolled }: HomeNavbarProps) {
  const { zone, item, inputMode, setFocus, setInputMode, registerZone, unregisterZone } = useFocus();

  // Register this zone as having 7 elements (0: Search, 1..5: Tabs, 6: Logout)
  useEffect(() => {
    registerZone(ZONE, 7);
    return () => unregisterZone(ZONE);
  }, [registerZone, unregisterZone]);

  const handleTabHover = () => {
    setInputMode('mouse');
  };

  const handleTabClick = (tabId: TabId) => {
    setInputMode('mouse');
    onTabChange(tabId);
  };

  const handleMouseLeaveNav = () => {
    // Return focus to the active tab/search when mouse leaves the navbar area (only for keyboard/gamepad users)
    if (inputMode !== 'mouse' && zone === ZONE) {
      if (activeTab === 'search') {
        setFocus(ZONE, 0, 'mouse');
      } else {
        const activeIdx = NAV_TABS.findIndex((t) => t.id === activeTab);
        if (activeIdx !== -1) {
          setFocus(ZONE, activeIdx + 1, 'mouse');
        }
      }
    }
  };

  // Synchronize focus when activeTab changes or when navbar gains focus (only for keyboard/gamepad users)
  useEffect(() => {
    if (inputMode !== 'mouse' && zone === ZONE) {
      if (activeTab === 'search') {
        setFocus(ZONE, 0);
      } else {
        const activeIdx = NAV_TABS.findIndex((t) => t.id === activeTab);
        if (activeIdx !== -1) {
          setFocus(ZONE, activeIdx + 1);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, zone, inputMode]);

  // Determine white focus capsule highlights (used for focused item in controller mode OR active item in mouse mode)
  const showWhiteSearch = (inputMode !== 'mouse' && zone === ZONE && item === 0) || (inputMode === 'mouse' && activeTab === 'search');
  const showWhiteLogout = (inputMode !== 'mouse' && zone === ZONE && item === 6);

  // Determine grey active capsule highlights (used for active item in controller mode when navbar is not focused)
  const showGreySearch = (inputMode !== 'mouse' && zone !== ZONE && activeTab === 'search');

  return (
    <motion.header
      className="fixed top-0 left-0 right-0 z-50 flex items-center px-12 transition-colors"
      animate={{
        backgroundColor: scrolled ? 'rgba(0,0,0,0.92)' : 'rgba(0,0,0,0)',
        backdropFilter: scrolled ? 'blur(12px)' : 'blur(0px)',
      }}
      transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      style={{ height: '80px' }}
    >
      <div className="w-full flex items-center justify-between">
        {/* ── Left: Avatar ── */}
        <div className="flex items-center gap-2.5 min-w-[90px]">
          <div className="w-10 h-10 rounded-sm bg-purple-600 flex items-center justify-center text-white font-bold text-base select-none">
            {user?.name?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <ChevronDown size={16} className="text-white/60" />
        </div>

        {/* ── Center: Search + Nav Tabs ── */}
        <motion.nav
          className="flex items-center gap-2"
          onMouseLeave={handleMouseLeaveNav}
          animate={{ scale: (inputMode !== 'mouse' && zone === ZONE) ? 1.05 : 1 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          style={{ originX: 0.5, originY: 0.5 }}
        >
          {/* Search Button (item 0) */}
          <button
            id="nav-search-btn"
            className="relative rounded-full transition-colors duration-150 cursor-pointer mr-3 flex items-center justify-center hover:bg-white/5"
            style={{
              color: showWhiteSearch ? '#000' : 'rgba(255,255,255,0.85)',
              width: '44px',
              height: '44px',
            }}
            onMouseEnter={handleTabHover}
            onClick={() => handleTabClick('search')}
            aria-label="Search"
          >
            {showWhiteSearch && (
              <motion.span
                layoutId="hash-nav-focus-capsule"
                className="absolute inset-0 rounded-full bg-white"
                style={{ zIndex: -1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              />
            )}
            {showGreySearch && (
              <motion.span
                layoutId="hash-nav-active-capsule"
                className="absolute inset-0 rounded-full bg-white/15"
                style={{ zIndex: -1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              />
            )}
            <Search size={20} className="relative" />
          </button>

          {/* Text Tabs (items 1..5) */}
          {NAV_TABS.map((tab, idx) => {
            const tabItemIdx = idx + 1;
            const isFocused = inputMode !== 'mouse' && zone === ZONE && item === tabItemIdx;
            const isWhiteActive = inputMode === 'mouse' && activeTab === tab.id;
            const isGreyActive = inputMode !== 'mouse' && zone !== ZONE && activeTab === tab.id;

            const isWhite = isFocused || isWhiteActive;

            return (
              <button
                key={tab.id}
                id={`nav-tab-${tab.id}`}
                className="relative px-6 py-2.5 text-base font-semibold rounded-full select-none cursor-pointer transition-colors hover:text-white"
                style={{
                  color: isWhite ? '#000' : 'rgba(255,255,255,0.85)',
                  zIndex: 1,
                }}
                onMouseEnter={handleTabHover}
                onClick={() => handleTabClick(tab.id)}
              >
                {/* Active Tab indicator (when not focused on navbar in controller mode) */}
                {isGreyActive && (
                  <motion.span
                    layoutId="hash-nav-active-capsule"
                    className="absolute inset-0 rounded-full bg-white/15"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  />
                )}

                {/* Selection Focus Capsule (active when focused in controller mode OR selected in mouse mode) */}
                {isWhite && (
                  <motion.span
                    layoutId="hash-nav-focus-capsule"
                    className="absolute inset-0 rounded-full bg-white"
                    style={{ zIndex: -1 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 30 }}
                  />
                )}

                <motion.span
                  animate={{ scale: isFocused ? 1.04 : 1 }}
                  transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                  className="relative"
                >
                  {tab.label}
                </motion.span>
              </button>
            );
          })}
        </motion.nav>

        {/* ── Right: HASH logo + logout ── */}
        <div className="flex items-center gap-6 min-w-[90px] justify-end">
          {/* Logout Button (item 6) */}
          <button
            id="nav-logout-btn"
            onClick={() => {
              setInputMode('mouse');
              onLogout();
            }}
            onMouseEnter={handleTabHover}
            className="relative rounded-full transition-colors cursor-pointer flex items-center justify-center hover:bg-white/5"
            style={{
              color: showWhiteLogout ? '#000' : 'rgba(255,255,255,0.65)',
              width: '44px',
              height: '44px',
            }}
            title="Sign out"
          >
            {showWhiteLogout && (
              <motion.span
                layoutId="hash-nav-focus-capsule"
                className="absolute inset-0 rounded-full bg-white"
                style={{ zIndex: -1 }}
                transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              />
            )}
            <LogOut size={18} className="relative" />
          </button>
          <span
            className="text-[#e50914] font-black text-3xl tracking-tighter select-none"
            style={{ fontFamily: "'NetflixSans','Helvetica Neue',Arial,sans-serif" }}
          >
            HASH
          </span>
        </div>
      </div>
    </motion.header>
  );
}
