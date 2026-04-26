# Blockene — Implementation Plan

Living document. **Update as work progresses** (see [Update protocol](#update-protocol)).

**Current status:** Slice 6 (level editor) ✅ wired — `#editor` route, click-to-place tools (wall / block + shape / 4 door sides), import/export JSON, test-play loop. Slice 7 (author the 10 levels) is the last one.

---

## Update protocol

- Tick boxes (`- [ ]` → `- [x]`) the moment a task completes — don't batch.
- Add subtasks when scope expands during a slice.
- When an open question is answered, **move it from "Open questions" to "Decisions"** with the chosen answer + one-line rationale.
- When a slice's DoD is met, mark the slice ✅ and start the next.
- If reality diverges from the plan, edit the plan, don't pretend it didn't.

---

## Open questions

*(none — populate as new ones come up)*

## Decisions

- **2026-04-25 — `src/audio/` as a new peer dir** for the sound module. Sound is neither pure engine, 3D scene, nor React UI; clean separation reads better than burying it.
- **2026-04-25 — Minimal level picker** in v1 (no star ratings). Just a list of levels you can jump into. Star-rating layer remains deferred per SPEC §8.
- **2026-04-25 — Build a level editor tool.** SPEC §7 calls this out as worth doing early; we'll build it *before* authoring the 10 MVP levels so authoring is fast.
- **2026-04-25 — Test runner: `bun:test`.** Built-in, zero install, faster than vitest. Swap to vitest later (e.g. for `neotest-vitest` integration) is a ~30-min job since engine is plain TS.
- **2026-04-25 — `commitMove` belongs in `moveResolver.ts`.** Snaps a finalized drag to integer cells (or removes the block on exit) and produces a new `EngineState`. Added during Slice 1 because "loadLevel → resolveDrag end-to-end" implies somewhere has to apply the result; keeping the snap in the engine keeps the store in Slice 2 a thin wrapper.
- **2026-04-25 — `commitMove` walks back to fully-in-bounds when releasing mid-door.** A multi-cell block dragged partway through a door and then released would otherwise snap to a position with some cells out-of-bounds (since `resolveDrag` accepts in-bounds *and* through-door positions during a drag). The snap-back walks dx/dy toward (0, 0) on the dominant axis until every cell is in-bounds.

---

## Cross-cutting decisions

- **Shared types:** `src/game/engine/types.ts` — `Color`, `BlockId`, `Cell`, `Block`, `Door`, `Wall`, `Level`, `EngineState`. Imported by `scene/`, `state/`, `input/`. Engine never imports from above.
- **Color palette split:** logical names (`'rare-blue'`, `'epic-purple'`, …) in `engine/types.ts`; hex map + side/highlight shades in `scene/palette.ts`. Engine never sees hex.
- **Animations:** start with manual `useFrame` lerps + already-installed `@tweenjs/tween.js`. Don't add `react-spring` unless we hit a wall.
- **Forward-compat:** every `Block` carries `type: 'normal'` + `modifiers: []` from day one (SPEC §8 deferred features).

---

## Slice 1 — Engine core (headless, fully tested) ✅

**Goal:** programmatically resolve a drag from cell A to cell B, all edge cases covered, before any rendering exists.

**Files:** `engine/types.ts`, `engine/Grid.ts`, `engine/Block.ts`, `engine/moveResolver.ts`, `engine/levelLoader.ts`, sibling `.test.ts` files.

**Tasks:**
- [x] Define types in `types.ts`. Block carries `type` + `modifiers` from day one.
- [x] `Grid`: occupancy 2D array, `isCellFree(cell, ignoreBlockId?)`, `isInBounds`, helpers.
- [x] `Block`: `getCells`, `translate(delta)`, `getExtent(side)` (span perpendicular to a board side).
- [x] `moveResolver.resolveDrag(state, blockId, desiredDeltaWorld)`:
  - [x] Sub-cell stepping at 0.1 units; per step check overlap with walls / blocks / edges.
  - [x] On block, decompose into axis components and try each — wall-slide.
  - [x] Door-aware edge: step crosses a board edge only if `door.color === block.color && extent fits door.width`.
  - [x] Returns final sub-cell position + `{ exited: boolean }`.
- [x] `moveResolver.commitMove(state, blockId, delta, exited)` — snaps to grid or removes the block on exit (see Decisions).
- [x] `levelLoader.parse(json)` → `EngineState`.
- [x] Tests: cell-aligned move, blocked-by-wall, blocked-by-block, diagonal-into-corner slides, fast-flick no-tunneling, door-match exits, door-mismatch blocks, door-too-narrow blocks.

**DoD:** `bun test` green; `loadLevel(json) → resolveDrag(...)` works end-to-end with **zero** React/Three.js imports anywhere in `engine/`. ✅ Met — 42 tests pass, `tsc -b` clean, `eslint` clean, no rendering imports anywhere in `engine/`.

---

## Slice 2 — Minimal R3F scene + drag ✅

**Goal:** see and drag a block. Ugly is fine.

**Files:** `state/gameStore.ts`, `scene/GameScene.tsx`, `scene/BoardMesh.tsx`, `scene/BlockMesh.tsx`, `scene/palette.ts`, `input/useDragControls.ts`, edits to `App.tsx` + `App.css` + `index.css`.

**Tasks:**
- [x] Zustand store wraps `EngineState`. Actions: `loadLevel`, `beginDrag`, `updateDrag`, `endDrag`, `undo`, `restart`. Store has zero game logic — delegates to `engine/moveResolver` and `engine/levelLoader`.
- [x] `GameScene`: orthographic camera tilted ~20° (position `(cx, -cy-4, 11)` looking at the board center), ambient + directional light, board + blocks.
- [x] `BoardMesh`: dark slate frame + base + per-cell tiles (gaps read as grid lines), wall cubes raised above the surface.
- [x] `BlockMesh`: per-block group, one rounded-ish cube per cell, base color from `scene/palette.ts`. (Studs / three-tone material come in Slice 4.)
- [x] `useDragControls`: window-level `pointermove`/`pointerup` listeners that raycast onto the z = 0 board plane and feed grid-space deltas into the store. `BlockMesh.onPointerDown` calls `beginDrag(blockId)` and the hook captures the start world position on the first pointermove (one-frame warmup; invisible in practice).
- [x] Hard-code one test level inline in `App.tsx` (3 blocks, 2 walls, no doors).

**DoD:** drag a block around a wall, slide diagonally into a corner, release and snap. No doors yet. ⚠️ Build is clean (`tsc -b`, `eslint`, `vite build`, `bun test` all green; dev server boots and serves all transformed modules) but **actual drag feel needs human in-browser verification** — I can't test pointer interaction headlessly.

---

## Slice 3 — Doors & exits ✅

**Goal:** levels are completable.

**Files:** `engine/moveResolver.ts` (snap-back + tests), `scene/DoorMesh.tsx`, `scene/BlockMesh.tsx` (adds `ExitingBlockMesh`), `state/gameStore.ts`, `scene/GameScene.tsx`, `App.tsx`.

**Tasks:**
- [x] Verify door-fit logic from Slice 1 against a level with mixed-color doors. (4 new tests: mixed-color exits, mismatched-color blocked, multi-block-same-color sequential exits, partial-exit snap-back.)
- [x] `DoorMesh`: colored tab protruding from board edge at `(side, position, width)`.
- [x] Store: when `resolveDrag` returns `exited: true`, remove block, push to history, derive `status: 'playing' | 'won'` from `Object.keys(state.blocks).length`.
- [x] Visual exit: an `ExitingBlockMesh` keeps the block visible while it lerps off-board, scales to 0, and fades over 450 ms. Engine state has already removed it.
- [x] Engine tests: 2-block 2-door level, multi-block-same-color-same-door, partial-exit-then-release.
- [x] Replaced dev level in `App.tsx` with a 3-block 2-door winnable layout (5×5, jade door top, crimson door right, one wall).

**DoD:** play a hand-coded 3-block 2-door level start to "won". ⚠️ Engine + store say so (status flips to `'won'` once `state.blocks` empties); needs human in-browser confirmation that doors render in the right spots and the exit animation looks right.

---

## Slice 4 — The chunky look (priority #1 polish) ✅

**Goal:** screenshots-quality look.

**Files:** `scene/BlockMesh.tsx`, `scene/BoardMesh.tsx`, `scene/GameScene.tsx`.

**Tasks:**
- [x] `BlockMesh`: drei `RoundedBox` per cell, 3×3 cylinder studs on top, three-tone effect via base body + brighter studs + warm/cool lighting. (Plain meshes for now — ~36 studs in the dev level fits comfortably; instancing deferred until perf demands it.)
- [x] Soft drop shadow under each block via drei `ContactShadows`.
- [x] `BoardMesh`: thick chunky frame, inset playfield, recessed cell tiles, four screw caps on the corners.
- [x] Three-light setup: ambient + warm key from above-right (`#FEF3C7`) + cool fill from below-left (`#A5B4FC`).
- [x] Grab lift: block lerps up by 0.18 z while dragging.
- [x] Exit shrink + fade + particle burst (10 deterministic-angle sparks in the block's highlight color, arc up and out).
- [x] Mobile: invisible 20%-larger hit volume mesh per cell.
- [ ] Collision squash on blocked step — deferred. Needs a "blocked-this-frame" signal from the store (compare desired vs resolved each `updateDrag`) plus a brief axis-aligned scale tween.
- [ ] InstancedMesh for studs (one per color) — deferred until 60fps fails on a real phone.

**DoD:** holds 60fps with 6+ blocks animating; matches the chunky look. ⚠️ Look matches in screenshots; needs human in-browser confirmation + a phone-viewport perf check before declaring 60fps DoD met.

---

## Slice 5 — Sound + UI shell ✅

**Goal:** game feels alive; player can navigate.

**Files:** `src/audio/sounds.ts`, `public/sounds/README.md`, `ui/Hud.tsx`, `ui/LevelComplete.tsx`, `ui/LevelPicker.tsx`, `levels/01.json`–`10.json`, `levels/index.ts`, `App.tsx`, `App.css`.

**Tasks:**
- [x] Sound module: Howler-backed registry exposing `play` / `startLoop` / `stopLoop`. Lazy-loads each clip on first use.
- [x] Wire 5 sounds: `grab` on `beginDrag`, `slide` looped during drag, `collide` on first stuck-frame transition, `exit` on a successful exit-commit, `win` when status flips to `'won'`.
- [x] `Hud`: undo (disabled when history empty), restart, level number + name, back-to-picker button. Safe-area-inset top/left/right.
- [x] `LevelComplete`: centered card overlay with `Next` (hidden on the last level) and `Levels` buttons.
- [x] `LevelPicker`: 2-column (3 on ≥600px wide) grid of numbered tiles with the level name. No stars / no completion tracking.
- [x] App routing: picker ↔ in-game via local state, plus dev-only `#level=NN` URL hash for jumping.
- [x] CSS-grid HUD layout, full-screen `<Canvas>`, overlay/picker styled.
- [x] **Decision:** sound files live under `public/sounds/` (drop `.mp3`s and they Just Work) instead of `src/assets/sounds/`. Original plan said the latter, but Vite would error at build time if any file is missing — `public/` lets Howler fail soft.
- [x] 10 hand-authored levels (`01.json`–`10.json`) following the SPEC §7 progression: drag → side exit → two colors → ordering → walls → detour → same hue → multi-cell shapes → multi-side → workshop.

**DoD:** all 5 sounds fire; undo/restart work; finish a level → "Next" → next level; picker lets you jump anywhere. ⚠️ Audio code paths exercised every action; sound files themselves are user-supplied (drop into `public/sounds/`). UI flow needs in-browser verification before declaring done.

---

## Slice 6 — Level editor tool ✅

**Goal:** make level authoring fast enough that Slice 7 isn't a slog. SPEC §7: "even a janky one" is fine.

**Files:** `engine/levelSerialize.ts`, `ui/editor/Editor.tsx`, `ui/editor/EditorScene.tsx`, `ui/editor/EditorToolbar.tsx`, `ui/editor/shapes.ts`, route into `App.tsx`, CSS in `App.css`.

**Tasks:**
- [x] Editor entry point: dev-only `#editor` URL hash routes the app to the editor on load.
- [x] Editor UI:
  - [x] Adjustable grid size (3-12 wide × 3-14 tall, content outside new bounds is dropped on shrink).
  - [x] Click an empty cell with the Wall tool to add; click a wall to remove. Walls under blocks are blocked.
  - [x] Block tool with color + shape palette (1×1, 2×1, 1×2, 3×1, 1×3, 2×2, L). Click empty cells to place; click a block to delete.
  - [x] Four door tools (one per side). Door width is configurable in the toolbar; clicking an existing door cell removes it.
- [x] `engine/levelSerialize.ts`: `serialize(EngineState, id, name) → Level`, plus `emptyState`, `nextBlockId`, `resize`. Round-trip test confirms `parse ∘ serialize = id`.
- [x] "Test play" button: serializes the current state and loads it into the game scene; HUD's Back returns to the editor with state preserved.
- [x] Export: copies the JSON to clipboard (falls back to a `prompt()` if the browser blocks `navigator.clipboard`).
- [x] Import: reads a JSON paste, populates the editor.

**DoD:** can build, test-play, and export a 3-block, 2-door level end-to-end without touching JSON by hand. ⚠️ Pipeline works end-to-end on engine + render; needs human in-browser verification of the click ergonomics.

---

## Slice 7 — Author the 10 levels

**Goal:** ship.

**Tasks:**
- [ ] Author `levels/01.json` … `10.json` using the Slice 6 editor, following SPEC §7 progression.
- [ ] Difficulty pass: solve each, tune.
- [ ] Wire authored levels into the picker (Slice 5).
- [ ] Final QA: SPEC §9 checklist (load time, browsers, mobile snappiness).

**DoD:** SPEC §9 satisfied — 10 ordered levels playable from the picker, snappy on phone, <3s load, runs in current Chrome / Safari / Firefox.
