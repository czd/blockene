# Blockene — Game Specification (v1 / MVP)

## 1. Overview

**Blockene** is a browser-based sliding-block puzzle game. The player drags colorful blocks across a grid and pushes them out through matching-colored doors on the board's perimeter. A level is cleared when all blocks have exited the board.

**v1 scope:** core mechanic + ~10 hand-designed levels. No meta-progression, no shop, no currency, no power-ups, no obstacles beyond the basics needed to make puzzles interesting. The goal is a tight, polished vertical slice of the core feel.

**Top priorities (in order):**
1. The chunky 3D block look
2. Snappy, responsive drag controls
3. Polish: sound, particles, juice
4. Level design depth (deferred to v2)

---

## 2. Core Mechanic

### The board
- A rectangular grid of cells (typical sizes: 6×8, 7×9, 8×10).
- Each cell is either **empty**, **wall** (immovable border/obstacle), or occupied by part of a **block**.
- The board's perimeter contains **doors** — colored openings on the edge of the board. Each door has a color, a side (top/right/bottom/left), and a **width** (how many perimeter cells it spans).
- A block can exit through a door only if (a) the colors match and (b) the block's leading edge in the axis perpendicular to the door's side fits entirely within the door's width. Concretely:
  - For a top or bottom door, the block's **horizontal extent** at the moment of exit must fit inside the door's horizontal span.
  - For a left or right door, the block's **vertical extent** at the moment of exit must fit inside the door's vertical span.
- This means a 1×3 horizontal line block needs a 3-wide door if it exits through the top/bottom, but only a 1-wide door if it exits through the left/right. Door size matches the block shape that's meant to pass through it.

### Blocks
- Each block is a polyomino: 1–6 cells in shapes like square, rectangle, L, T, plus (+), line.
- Each block has a single color (red, blue, green, yellow, purple, pink, orange, cyan).
- Blocks are rendered as chunky 3D pieces that look like interlocking plastic plates with stud bumps on top — see screenshots for reference.

### Movement (drag-controlled, free 2D)
- The player presses on a block and drags it.
- Blocks can move freely on **both axes simultaneously** — there is no axis lock. If the player drags diagonally, the block follows diagonally as far as the path allows.
- The block's position tracks the finger/cursor as long as the path is clear.
- A block stops at any cell where it would overlap another block, a wall, or the board edge (unless the edge has a matching door, see below).
- If the player drags a block toward a **matching-colored door** at the edge, and the block's perpendicular extent fits the door's width, the block exits through it and is removed from the board.
- If the door's color does not match, or the block doesn't fit, the edge behaves as a wall.
- Releasing the drag snaps the block to the nearest grid-aligned cell.

### Win condition
- All blocks removed from the board → level complete.

### Lose condition (v1)
- **None.** No timer, no move limit. Levels are pure puzzles. (Timer/moves can come later as a star-rating layer.)

### Undo
- A single "undo last move" button. Unlimited undos in v1.
- A "restart level" button.

---

## 3. Visual Direction

The 3D chunky-block look is the #1 priority, so this section is detailed.

### Block aesthetic
- Each block cell is a rounded cube with a **subtle stud pattern** on top (3×3 or 4×4 raised bumps per cell, like the reference screenshots).
- Soft, saturated colors with a slight gradient from top to bottom edge.
- Soft drop shadow on the board beneath each block.
- Blocks sit slightly above the grid surface (~10–15% of cell height of vertical offset).

### Color palette

The palette riffs on classic MMO loot-rarity colors — **rare blue**, **epic purple**, **legendary gold** — extended into a coherent set of saturated, jewel-tone hues. The intent is that each block looks like a precious item rather than a plastic toy.

**Block colors** (8 hues, all roughly equal in perceived saturation and brightness so no single block dominates the board):

| Name | Hex | Notes |
|---|---|---|
| Rare Blue | `#3B82F6` | The "rare" anchor — clean azure |
| Deep Sapphire | `#1E40AF` | Cooler, deeper blue for contrast |
| Epic Purple | `#A855F7` | The "epic" anchor — vivid violet |
| Royal Magenta | `#C026D3` | Pinker companion to purple |
| Legendary Gold | `#F59E0B` | The "legendary" anchor — warm gold |
| Crimson | `#DC2626` | A red that complements the gold |
| Jade | `#10B981` | Cool green, reads as a gem hue |
| Frost Cyan | `#06B6D4` | Bright accent, distinct from rare blue |

These are starting values — expect to tune saturation and lightness once they're rendered as 3D meshes with lighting. Each block color should also have a slightly darker shade for the side faces of the cube and a slightly brighter shade for the stud highlights.

**Board & UI:**
- Board base: deep slate (`#1E293B`) — dark enough that gold and blue pop, neutral enough not to compete.
- Board frame / screw decorations: muted graphite (`#334155`).
- Empty cell: subtle mid-slate (`#475569`) with a soft inset shadow.
- Door tabs: render in the door's own color, matching block hues exactly so the visual link is unambiguous.
- HUD text: warm off-white (`#F8FAFC`) for readability against the dark board.

**Lighting:** a warm key light from above-right plus a cooler fill from below-left makes the gold and purple read as metallic/jewel-like rather than flat. This is more impactful than fiddling with the base hex values.

### Camera
- Slight isometric / 3/4 perspective tilt — not flat top-down. Around 15–25° tilt forward.
- Orthographic or very mild perspective projection. Avoid strong perspective distortion.

### Board
- Gray grid base with screw-head decorations on the corners and around the frame (see screenshots).
- Colored "door" tabs protrude from the perimeter where blocks can exit.

### Animations & juice
- Block lifts ~5% when grabbed (scale + shadow grows).
- Slight squash on collision when a block bumps a wall or another block.
- Exit animation: block scales down + fades + small particle burst in its color when it leaves through a door.
- Win animation: remaining empty board flashes, "Level Complete" overlay slides in.

### Sound (minimum set for v1)
- Block grab (soft thud)
- Block slide (subtle scrape, looped while moving)
- Block-on-block collision (light click)
- Block exits through door (satisfying pop)
- Level complete (short chime)

---

## 4. Tech Recommendation

Given the priority on the 3D look + browser delivery + drag controls, here is the recommended stack:

### Recommended: **Three.js + React + Vite + Zustand**

**Why:**
- **Three.js** gives you real 3D rendering for the chunky block look. The studs, soft shadows, and tilt camera are trivial in 3D and tedious to fake convincingly in 2D CSS or SVG.
- **React** for UI overlay (HUD, menus, level select, modals). React handles non-game-world UI cleanly while Three.js owns the canvas.
- **`@react-three/fiber`** to bridge them — declarative Three.js inside React. This is well-trodden ground with great DX.
- **`@react-three/drei`** for camera controls, helpers, and useful primitives.
- **Vite** for dev server and bundling. Run via Bun. Fast, no config drama.
- **Zustand** for game state. Simpler than Redux, plays nicely with R3F, and lets the game loop read state without component re-renders.
- **Howler.js** for audio (5 sounds, pooling, mobile-friendly).
- A small tween library (`@tweenjs/tween.js` or `framer-motion-3d`) for block animations.

**Tooling:** Bun as the package manager and runtime (`bun add`, `bun run`, `bunx`).

### Should we use a game engine instead?

Real options considered:

- **Phaser 3** — strongest puzzle-game ecosystem in the browser, but 2D-first. You'd be using its weakest area (3D) for your top priority. Skip.
- **PlayCanvas** — proper browser 3D engine with a visual editor. Genuinely good fit on paper. The cost is learning a new editor and committing to its ecosystem; for a 10-level MVP that ROI is poor. Worth reconsidering if v2 grows complicated.
- **Babylon.js** — full 3D engine with built-in physics, animation, GUI. Stronger if you needed physics-driven blocks, which you don't. More than this game requires.
- **Unity / Godot WebGL** — overkill, slow first-load, and you give up the React/web-native dev loop.

The honest test: what does an engine give you that you'd actually use here?

| Engine feature | Blockene's need | Verdict |
|---|---|---|
| Physics | Movement is grid-snapped, not physics | Not needed |
| Scene editor | Levels are JSON, custom editor planned | Not needed |
| Asset pipeline | Procedural blocks | Not needed |
| Audio system | ~5 sounds | Howler covers it |
| Animation system | Lift, slide, squash, exit | Tween lib covers it |
| Input system | Pointer + grid translation | Custom code is better; mechanic-specific |

The value-add of a full engine is genuinely low for this scope. **Three.js + R3F is the recommendation.** Pivot to PlayCanvas only if you find yourself fighting scene management or animation orchestration around level 5.

### Suggested project structure
```
src/
  game/
    engine/         # Pure logic: grid, blocks, move resolution, win check
      Grid.ts
      Block.ts
      moveResolver.ts
      levelLoader.ts
    scene/          # Three.js / R3F components
      BlockMesh.tsx
      BoardMesh.tsx
      DoorMesh.tsx
      GameScene.tsx
    input/
      useDragControls.ts   # Pointer → grid-cell translation
    state/
      gameStore.ts         # Zustand
  ui/                # React HUD, menus, modals
  levels/
    01.json ... 10.json
  assets/
    sounds/
  App.tsx
  main.tsx
```

The hard separation between `engine/` (pure TS, no rendering) and `scene/` (rendering only) is important. It means you can unit-test the puzzle logic without a browser, and swap the renderer later if you ever want to.

---

## 5. Data Model

### Level JSON shape
```jsonc
{
  "id": "01",
  "name": "First Steps",
  "gridWidth": 6,
  "gridHeight": 8,
  "blocks": [
    {
      "id": "b1",
      "color": "red",
      "cells": [[1,2], [2,2], [1,3]]   // grid coordinates the block occupies
    }
  ],
  "doors": [
    { "side": "top",    "position": 2, "width": 3, "color": "red" },
    { "side": "right",  "position": 4, "width": 1, "color": "blue" }
  ],
  "walls": [
    [3, 5]   // immovable cells
  ]
}
```

### Runtime state (Zustand)
- `grid`: 2D array, each cell is `null | { blockId, isWall }`
- `blocks`: `Record<blockId, Block>`
- `doors`: array of doors
- `selectedBlockId`: currently dragged block, or null
- `dragOffset`: current drag position in grid units
- `history`: stack of moves for undo
- `status`: `'playing' | 'won'`

### Move resolution (the critical algorithm)

The player drags a block from cell set A toward a target cell set B, where B may differ from A on both axes (free 2D movement).

The naive approach — interpolating directly from A to B — fails because the block could "tunnel" through obstacles diagonally. Instead, the resolver advances the block along the drag delta in **small sub-cell steps**, validating each step:

1. On pointer down, snapshot the block's starting cell position and the pointer's world position.
2. On each pointer move, compute the desired world-space position from the pointer delta.
3. Resolve the desired position via incremental sub-cell stepping:
   - Break the movement from the block's current position to the desired position into small steps (e.g. 0.1 cell units each).
   - For each step, check whether the block's bounding cells (rounded to the nearest cell) would overlap a wall, another block, or extend off the board through a non-matching edge.
   - If a step is blocked, try the two axis-aligned components of the step independently — this allows the block to "slide along" an obstacle when moved diagonally into it (standard wall-sliding pattern).
   - Stop at the last valid sub-cell position.
4. Render the block at the resolved sub-cell position (smooth, not snapped, while dragging) so the player gets continuous tactile feedback.
5. Door exits: if a step would move the block off the board on a side with a matching-colored door, and the block's perpendicular extent fits within the door's span, allow the block to continue moving off-board. The block is "in transit" while partially through the door — don't commit the exit until the block has fully cleared the edge.
6. On pointer release, snap to the nearest valid grid cell, commit the position, and push to undo history. If the block fully exited, trigger the exit animation and remove it.

**Two important properties of this approach:**
- **Diagonal slides work naturally.** Drag a block down-and-right into an L-shaped corner and it slides into the corner.
- **No tunneling.** Even fast pointer flicks are decomposed into sub-cell steps, so the block can't skip over a 1-cell-thick wall.

The sub-cell step size is a tuning knob. 0.1 cells is a reasonable starting point; smaller is safer but more expensive.

**On committed positions:** while the block tracks the pointer at sub-cell precision during the drag, the *committed* position on pointer release must always be cell-aligned. This keeps the puzzle state discrete and undo-able.

---

## 6. Input Handling

### Drag flow
1. **Pointer down on a block** → select it, lift it visually, record start position.
2. **Pointer move** → translate screen-space delta into grid-space delta. Run move resolution (see §5) at sub-cell precision. The block follows the pointer continuously, including diagonally, sliding along obstacles when blocked on one axis.
3. **Pointer up** → snap to the nearest valid grid cell, drop animation, push to history. If a block exited, trigger exit anim and check win condition.

### Translating screen pixels to grid cells
Three.js raycasting from the camera onto a flat plane at the board's surface gives a world-space point; convert to grid coords by dividing by cell size and rounding. `@react-three/fiber` exposes pointer events that already provide world-space hit info.

### Touch + mouse
Use Pointer Events (one code path for both). Test on actual mobile early — the hit area for grabbing a single-cell block needs to be generous on touch (extend the invisible hit volume ~20% beyond the visual mesh).

---

## 7. Level Design Notes (for the 10 MVP levels)

Even with no obstacles beyond walls, you can build a good progression:

- **Levels 1–2:** One block, one door. Teach drag + exit.
- **Levels 3–4:** Two blocks, two doors. Teach that color matters and blocks block each other.
- **Levels 5–6:** Introduce wall cells. Force ordering.
- **Levels 7–8:** Multiple blocks of the same color. Shape-tessellation puzzles.
- **Levels 9–10:** Wider boards, ~5 blocks, doors on multiple sides. Real "aha" puzzles.

Build a small **level editor** as an internal tool early — even a janky one. Hand-authoring level JSON gets old fast around level 4.

---

## 8. Out of Scope for v1 (parking lot)

These are in the screenshots but explicitly deferred:
- Timer / countdown
- Coins / currency
- Power-ups (freeze, hammer, magnet)
- Chain locks with move counters
- Keys and locked blocks
- Frozen / numbered / bomb blocks
- Star collectibles
- Level select screen with star ratings
- Persistence / save state
- Hints

Designing the engine as data-driven (blocks have a `type` and `modifiers` field, even if only `"normal"` is used in v1) makes adding these later much cheaper.

---

## 9. Definition of Done for v1

- 10 playable levels, hand-authored, ordered by difficulty.
- Drag controls feel snappy on desktop and mid-range mobile.
- 3D blocks render with studs, soft shadows, tilted camera.
- Block grab / slide / collide / exit / win sounds in place.
- Exit and win animations with particles.
- Undo and restart buttons work.
- Loads in <3 seconds on a typical broadband connection.
- Works in current Chrome, Safari, Firefox.

---

## 10. Mobile-First Notes

The game is designed for touch first; mouse/desktop is a follow-on, not the primary target.

- **Viewport:** portrait orientation, target ~390×844 reference (modern phone). Lock to portrait.
- **Touch targets:** the invisible hit volume around each block extends ~20% beyond the visible mesh so single-cell blocks are grabbable with a fingertip.
- **No hover states** — every interaction must work from press → drag → release.
- **Performance budget:** 60fps on a mid-range Android (e.g. Pixel 6a) with all blocks animating. This is the constraint that should drive any "should I add this fancy effect" decision.
- **Rendering tips:** use instanced meshes for the stud bumps (one block can have 9–16 studs; multiplied across 10 blocks that's 100+ meshes if naive). Bake shadows where possible rather than dynamic shadow casting per block.
- **Safe areas:** respect iOS notch / home indicator. HUD lives inside the safe inset.
- **No fullscreen API gymnastics** — the game runs in a normal browser tab. Add `viewport-fit=cover` and the standard mobile-web meta tags.

## 11. Open Questions (resolved)

1. ~~Single-color or multi-color blocks?~~ → **Single-color only for v1.** Multi-color is a deferred feature where the bottom layer must match first, then the top layer is revealed in the same shape.
2. ~~Door size rule?~~ → **Door size matches the block dimension that crosses it.** A 1×3 line through a top door needs 3 cells of door; through a side door, 1 cell. See §2 for full rule.
3. ~~Same-color door, multiple blocks?~~ → **Yes, multiple blocks of the same color exit through the same door,** as long as each one fits the door's width.
4. ~~Mobile-first or desktop-first?~~ → **Mobile-first.** Desktop works as a side benefit of pointer events.
5. ~~Procedural or imported block meshes?~~ → **Procedurally generated in code** for v1.

## 12. Remaining Open Questions

*(All previously open questions have been resolved. New ones get added here as they come up during implementation.)*

### Resolved
- **Door visualization:** open to interpretation. No arrows required. Aim for visual clarity — the door's color and position should make it obvious which block exits where.
- **Drag axis lock:** **none.** Blocks move freely on both axes simultaneously, with sub-cell-stepped collision resolution that supports diagonal sliding along obstacles. See §5.
- **Color palette:** defined in §3 — MMO rarity-inspired (rare blue, epic purple, legendary gold) extended to 8 jewel-tone hues.
