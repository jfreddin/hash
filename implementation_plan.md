# HASH Home Screen — Full Implementation Plan

## What's Being Built

A Netflix TV-mode home screen (`/home`) with a **unified input system** — mouse hover, keyboard arrows, and
gamepad thumbstick/D-pad all drive the same "virtual cursor" through a 2D focus grid. Every transition
uses eased Framer Motion animations (cubic-bezier, never linear).

---

## User Review Required

> [!IMPORTANT]
> **Trailer playback**: Movie data uses `videos[].key` (YouTube video keys from TMDB) and `videos[].site`.
> After 5 seconds of focus, the card will embed a muted YouTube iframe preview (`?autoplay=1&mute=1`).
> This requires internet access to YouTube CDN. If you prefer a different approach (e.g. local fallback, or skip trailer on no key), let me know.

> [!IMPORTANT]
> **Movie images**: Posters and backdrops come from `images.posters[0].file_path` and `images.backdrops[0].file_path`.
> These are TMDB file paths. I will prefix them with `https://image.tmdb.org/t/p/w500` for posters and `w1280` for backdrops.
> This requires internet access to TMDB's CDN.

> [!IMPORTANT]
> **Genres/Row grouping**: The movie schema has no `genre` field. The backend controllers return flat lists
> (trending, popular, new, mylist). The rows will be:
> - **Trending Now** → `/api/movies/trending`
> - **Top Rated** → `/api/movies/popular`
> - **New Releases** → `/api/movies/new`
> - **My List** → `/api/movies/mylist`
>
> The hero/spotlight uses the #1 trending movie. Is this acceptable, or do you want genre-based rows?
> If genres are needed, a `genres` field must be added to the Movie schema.

---

## Architecture

### Focus Grid System
The entire UI is modelled as a **2D grid of zones**:

```
Zone 0: Navbar        [Home] [Shows] [Movies] [Games] [My HASH]
Zone 1: Hero          [HeroCard (Play, More Info)]
Zone 2: Trending Row  [Card0] [Card1] [Card2] ... [Card19]
Zone 3: Top Rated Row [Card0] [Card1] ...
Zone 4: New Releases  [Card0] [Card1] ...
Zone 5: My List       [Card0] [Card1] ...
```

- **Up/Down** (thumbstick Y, D-pad, arrow keys) → move between zones
- **Left/Right** (thumbstick X, D-pad, arrow keys) → move within a zone
- **Enter / A / Cross** → select focused element
- **Backspace / B / Circle** → go back / navigate to previous route
- On app load, focus starts at `[1, 0]` (HeroCard)

### Input Priority
All three input methods (mouse, keyboard, gamepad) write to a shared `FocusStore` (Zustand-like React context).
Mouse hover sets focus directly. Keyboard/gamepad use delta-based movement. The last active input mode
("mouse" | "keyboard" | "gamepad") is tracked to show/hide controller hints.

---

## Proposed Changes

### New Files

#### [NEW] `src/context/FocusContext.tsx`
Global 2D focus state: `{ zone: number, item: number }`. Exposes:
- `focus` — current `[zone, item]`  
- `setFocus(zone, item)` — direct set (mouse hover)  
- `moveFocus(dz, di)` — delta move (keyboard/gamepad)  
- `zones` — registered zone metadata (max items per zone, scroll offset)

#### [NEW] `src/hooks/useGamepad.ts`
Polls `navigator.getGamepads()` in a `requestAnimationFrame` loop.
- Detects PS4/PS5 and Xbox layouts (same button indices in Gamepad API)
- Button indices: `0` = A/Cross (select), `1` = B/Circle (back)
- D-pad: `12` Up, `13` Down, `14` Left, `15` Right
- Left stick: `axes[0]` (X), `axes[1]` (Y), threshold `0.5`
- Input debounce: `200ms` between repeated navigations
- Emits `navigate(dz, di)` and `select()` / `back()` to `FocusContext`

#### [NEW] `src/hooks/useKeyboardNav.ts`
Listens to `keydown` events. Skips if `event.target` is an input/textarea.
- `ArrowUp/Down` → `moveFocus(±1, 0)`
- `ArrowLeft/Right` → `moveFocus(0, ±1)`
- `Enter` → select focused element
- `Backspace` → go back

#### [NEW] `src/components/home/HomeNavbar.tsx`
```
┌──────────────────────────────────────────────────────┐
│ [Avatar ▾]   [🔍]  [Home] [Shows] [Movies] [Games] [My HASH]   [HASH logo] │
└──────────────────────────────────────────────────────┘
```
- Active tab has a white rounded-full capsule (`layoutId="navCapsule"`) that slides with Framer layout animation
- On focus/hover: tab scales to `1.08`, capsule appears around it — eased with `spring(stiffness:300, damping:30)`
- Transparent → slight dark blur background on scroll (`backdrop-blur-md bg-black/60` after 80px scroll)
- Clicking a tab updates a `activeTab` state and animates the page section with a fade

#### [NEW] `src/components/home/HeroSection.tsx`
- Displays the #1 trending movie
- Full-width backdrop image (`w1280`) with bottom gradient fade
- Movie logo (`images.logos[0]`) if available, else large title text
- Metadata row: `release_date year • certification • cast[0-2].name`
- Two buttons: **▶ Play** (red filled) and **ⓘ More Info** (gray translucent)
- Controller focus indicator: 2px white outer border on the card, eased opacity transition
- After 5s of focus → YouTube iframe trailer overlays the backdrop (muted autoplay)

#### [NEW] `src/components/home/MovieRow.tsx`
- Horizontal scroll strip with a category title
- Shows 6 cards visible, rest scroll with arrow buttons or controller
- Focused card in the row: `scale(1.08)`, `border-2 border-white`, z-index raised
- After 5s of card focus → inline YouTube trailer preview (16:9 aspect ratio)
- Row scroll is animated with Framer `x` motion value

#### [NEW] `src/components/home/MovieCard.tsx`
- Poster image (`w500`)
- On hover/focus: scale up + white border glow + title appears at bottom
- 5s focus timer → `trailerKey` from `videos[]` (first `type: "Trailer"` on YouTube) → YouTube embed

#### [NEW] `src/components/home/PlaceholderPage.tsx`
Shared placeholder for Shows, Movies, Games, My HASH tabs:
```
[Large tab icon]
"[Tab Name] — Coming Soon"
[subtitle: "We're working on it"]
```
Fades in with Framer `AnimatePresence`.

### Modified Files

#### [MODIFY] [Home.tsx](file:///d:/Programming/WebDev/Hash/Hash%20Client/src/pages/Home.tsx)
Complete rewrite. Orchestrates:
1. `FocusProvider` wrapping everything
2. `useGamepad` and `useKeyboardNav` hooks mounted here
3. Three API fetches on mount: trending, popular, new, mylist
4. `activeTab` state controlling which content section renders (with AnimatePresence)
5. Passes `user` prop to `HomeNavbar`

#### [MODIFY] [App.tsx](file:///d:/Programming/WebDev/Hash/Hash%20Client/src/App.tsx)
No routing changes needed — `Home` already receives `user` and `onLogout` props.

---

## Animation Spec

All animations use **eased cubic-bezier** — never linear:

| Element | Trigger | Animation |
|---------|---------|-----------|
| Navbar capsule | Tab change | `layoutId` spring: `stiffness 300, damping 30` |
| Nav item | Hover/focus | `scale: 1.08`, `duration: 0.2, ease: [0.25, 0.1, 0.25, 1]` |
| Nav item | Blur | `scale: 1.0`, same ease |
| Movie card | Hover/focus | `scale: 1.08`, `y: -4`, spring `stiffness 260 damping 25` |
| Movie card | Blur | Back to `scale: 1.0, y: 0` |
| Tab page | Enter | `opacity: 0 → 1, x: 20 → 0`, `duration: 0.3, ease: easeOut` |
| Tab page | Exit | `opacity: 1 → 0, x: 0 → -20` |
| Hero trailer | 5s focus | `opacity: 0 → 1`, `duration: 0.6, ease: easeInOut` |
| Navbar BG | Scroll past 80px | `backdrop-filter` + `bg-opacity`, `transition: 0.4s ease` |

---

## Verification Plan

### Manual
1. Open `localhost:5173/home` — trending movies load, hero shows #1 trending
2. Mouse hover over navbar → capsule slides, item scales
3. Click Shows → placeholder fades in
4. Arrow keys → navigate between zones and rows
5. Focus a card for 5s → trailer iframe appears
6. Connect gamepad → thumbstick moves focus, A/Cross selects, B/Circle goes back
7. Gamepad: navigate to Shows tab → Shows placeholder fades in

### Automated (browser subagent)
- Screenshot of home page with data loaded
- Screenshot of navbar hover state
- Screenshot of Shows placeholder page
