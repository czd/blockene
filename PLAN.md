# Blockene — Implementation Plan

Living document. **Update as work progresses** (see [Update protocol](#update-protocol)).

**Current status:** Slice 1 (engine core) ✅ complete — 42 tests green, engine is React/Three-free. Slice 2 ready to start.

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

## Slice 2 — Minimal R3F scene + drag

**Goal:** see and drag a block. Ugly is fine.

**Files:** `state/gameStore.ts`, `scene/GameScene.tsx`, `scene/BoardMesh.tsx`, `scene/BlockMesh.tsx`, `input/useDragControls.ts`, edits to `App.tsx` + `main.tsx`.

**Tasks:**
- [ ] Zustand store wraps `EngineState`. Actions: `loadLevel`, `beginDrag`, `updateDrag`, `endDrag`, `undo`, `restart`. Store has zero game logic — delegates to `engine/moveResolver`.
- [ ] `GameScene`: tilted ortho camera (~20°), ambient + directional light, board + blocks.
- [ ] `BoardMesh`: flat dark plane with grid lines.
- [ ] `BlockMesh`: per-block group, one flat-shaded cube per cell, base color from `scene/palette.ts`.
- [ ] `useDragControls`: `onPointerDown` on a block group → `beginDrag` with raycast hit on board plane; window-level `onPointerMove` → `updateDrag`; `onPointerUp` → `endDrag`.
- [ ] Hard-code one test level inline (no JSON loading yet).

**DoD:** drag a block around a wall, slide diagonally into a corner, release and snap. No doors yet.

---

## Slice 3 — Doors & exits

**Goal:** levels are completable.

**Files:** `engine/moveResolver.ts` (door logic exercised), `scene/DoorMesh.tsx`, `state/gameStore.ts`, `scene/GameScene.tsx`.

**Tasks:**
- [ ] Verify door-fit logic from Slice 1 against a level with mixed-color doors.
- [ ] `DoorMesh`: colored tab protruding from board edge at `(side, position, width)`.
- [ ] Store: when `resolveDrag` returns `exited: true`, remove block, push to history, check win → `status: 'won'`.
- [ ] Visual exit: block lerps off-board, scales to 0, fades. Visual only — engine state already removed it.
- [ ] Engine tests: 2-block 2-door level, multi-block-same-color-same-door.

**DoD:** play a hand-coded 3-block 2-door level start to "won".

---

## Slice 4 — The chunky look (priority #1 polish)

**Goal:** screenshots-quality look.

**Files:** `scene/BlockMesh.tsx`, `scene/BoardMesh.tsx`, `scene/GameScene.tsx`, `scene/palette.ts`, new `scene/anim.ts`.

**Tasks:**
- [ ] `BlockMesh`: rounded-box geometry per cell (`drei`'s `RoundedBox`), instanced 3×3 stud mesh on top, three-tone material (top / side / highlight).
- [ ] Soft drop shadow under each block (drei `ContactShadows` or baked plane).
- [ ] `BoardMesh`: deep slate base, inset cell shadows, screw decorations on corners.
- [ ] Lighting: warm key from above-right + cool fill from below-left + ambient.
- [ ] Animations: grab lift (~5%), collision squash on blocked step, exit shrink + fade + particle burst.
- [ ] Mobile: invisible larger hit volume mesh per block (~20% larger) per SPEC §10.
- [ ] Performance: instance studs across blocks (one `InstancedMesh` per color), 60fps on phone-sized viewport.

**DoD:** holds 60fps with 6+ blocks animating; matches the chunky look.

---

## Slice 5 — Sound + UI shell

**Goal:** game feels alive; player can navigate.

**Files:** `src/audio/sounds.ts`, `assets/sounds/*.mp3`, `ui/Hud.tsx`, `ui/LevelComplete.tsx`, `ui/LevelPicker.tsx`, `App.tsx`.

**Tasks:**
- [ ] Sound module: Howler-backed registry; `play(name)`. Triggered from store actions.
- [ ] Wire 5 sounds: grab, slide (looped while dragging), collide, exit, win.
- [ ] `Hud`: undo button, restart button, level number, "back to picker" button.
- [ ] `LevelComplete`: overlay with "Next" button.
- [ ] `LevelPicker`: minimal list of levels (numbered tiles, completed/not). No stars.
- [ ] App routing: picker ↔ in-game, plus dev-only `#level=05` URL hash for jumping.
- [ ] CSS-grid layout in `App.tsx`: `<Canvas>` fills, HUD overlays with safe-area insets.

**DoD:** all 5 sounds fire; undo/restart work; finish a level → "Next" → next level; picker lets you jump anywhere.

---

## Slice 6 — Level editor tool

**Goal:** make level authoring fast enough that Slice 7 isn't a slog. SPEC §7: "even a janky one" is fine.

**Files:** `ui/editor/Editor.tsx`, `ui/editor/EditorToolbar.tsx`, `engine/levelSerialize.ts`, route into `App.tsx`.

**Tasks:**
- [ ] Decide editor entry point: dev-only route (`#editor`) vs. always-on. *(Default: dev-only via URL hash.)*
- [ ] Editor UI:
  - [ ] Adjustable grid size.
  - [ ] Click empty cell to add wall; click wall to remove.
  - [ ] Pick a color + a shape from a palette, click cells to place a block; click a block to delete.
  - [ ] Click an edge cell to add/edit a door (color + width).
- [ ] `engine/levelSerialize.ts`: `serialize(EngineState) → Level JSON` (the inverse of `levelLoader.parse`).
- [ ] "Test play" button: load the in-progress level into the game scene.
- [ ] Export to clipboard / download as JSON.
- [ ] Import existing JSON to edit.

**DoD:** can build, test-play, and export a 3-block, 2-door level end-to-end without touching JSON by hand.

---

## Slice 7 — Author the 10 levels

**Goal:** ship.

**Tasks:**
- [ ] Author `levels/01.json` … `10.json` using the Slice 6 editor, following SPEC §7 progression.
- [ ] Difficulty pass: solve each, tune.
- [ ] Wire authored levels into the picker (Slice 5).
- [ ] Final QA: SPEC §9 checklist (load time, browsers, mobile snappiness).

**DoD:** SPEC §9 satisfied — 10 ordered levels playable from the picker, snappy on phone, <3s load, runs in current Chrome / Safari / Firefox.
