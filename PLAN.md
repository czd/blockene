# Blockene — Implementation Plan

Living document. **Update as work progresses** (see [Update protocol](#update-protocol)).

**Current status:** Slice 0 (scaffolding) ✅ complete. Awaiting answers to [Open questions](#open-questions) before Slice 1.

---

## Update protocol

- Tick boxes (`- [ ]` → `- [x]`) the moment a task completes — don't batch.
- Add subtasks when scope expands during a slice.
- When an open question is answered, **move it from "Open questions" to "Decisions"** with the chosen answer + one-line rationale.
- When a slice's DoD is met, mark the slice ✅ and start the next.
- If reality diverges from the plan, edit the plan, don't pretend it didn't.

---

## Open questions

These are blocking decisions for upcoming slices. Resolve before the slice that needs them.

1. **`src/audio/` as a new peer dir** for the sound module — OK? Alternatives: bury inside `state/`, or fold into `ui/`. *(Needed for Slice 5.)*
2. **Test runner:** `bun:test` (built-in, zero install) or `vitest` (better editor integration)? *(Needed for Slice 1.)*
3. **Level-select scope:** SPEC §8 lists star-rated level select as deferred. For v1, do we want even a minimal picker, or just sequential progression (current → next on win)? *(Needed for Slice 5/6.)*
4. **Editor tool** (SPEC §7): build a tiny in-app level editor in Slice 6, or skip entirely for v1 and hand-author JSON? *(Needed for Slice 6.)*

## Decisions

*(empty — populate as questions resolve, with date + one-line rationale)*

---

## Cross-cutting decisions

- **Shared types:** `src/game/engine/types.ts` — `Color`, `BlockId`, `Cell`, `Block`, `Door`, `Wall`, `Level`, `EngineState`. Imported by `scene/`, `state/`, `input/`. Engine never imports from above.
- **Color palette split:** logical names (`'rare-blue'`, `'epic-purple'`, …) in `engine/types.ts`; hex map + side/highlight shades in `scene/palette.ts`. Engine never sees hex.
- **Animations:** start with manual `useFrame` lerps + already-installed `@tweenjs/tween.js`. Don't add `react-spring` unless we hit a wall.
- **Forward-compat:** every `Block` carries `type: 'normal'` + `modifiers: []` from day one (SPEC §8 deferred features).

---

## Slice 1 — Engine core (headless, fully tested)

**Goal:** programmatically resolve a drag from cell A to cell B, all edge cases covered, before any rendering exists.

**Files:** `engine/types.ts`, `engine/Grid.ts`, `engine/Block.ts`, `engine/moveResolver.ts`, `engine/levelLoader.ts`, sibling `.test.ts` files.

**Tasks:**
- [ ] Define types in `types.ts`. Block carries `type` + `modifiers` from day one.
- [ ] `Grid`: occupancy 2D array, `isCellFree(cell, ignoreBlockId?)`, `isInBounds`, helpers.
- [ ] `Block`: `getCells`, `translate(delta)`, `getExtent(side)` (span perpendicular to a board side).
- [ ] `moveResolver.resolveDrag(state, blockId, desiredDeltaWorld)`:
  - [ ] Sub-cell stepping at 0.1 units; per step check overlap with walls / blocks / edges.
  - [ ] On block, decompose into axis components and try each — wall-slide.
  - [ ] Door-aware edge: step crosses a board edge only if `door.color === block.color && extent fits door.width`.
  - [ ] Returns final sub-cell position + `{ exited: boolean }`.
- [ ] `levelLoader.parse(json)` → `EngineState`.
- [ ] Tests: cell-aligned move, blocked-by-wall, blocked-by-block, diagonal-into-corner slides, fast-flick no-tunneling, door-match exits, door-mismatch blocks, door-too-narrow blocks.

**DoD:** `bun test` green; `loadLevel(json) → resolveDrag(...)` works end-to-end with **zero** React/Three.js imports anywhere in `engine/`.

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

**Files:** `audio/sounds.ts` *(pending Q1)*, `assets/sounds/*.mp3`, `ui/Hud.tsx`, `ui/LevelComplete.tsx`, `App.tsx`.

**Tasks:**
- [ ] Sound module: Howler-backed registry; `play(name)`. Triggered from store actions.
- [ ] Wire 5 sounds: grab, slide (looped while dragging), collide, exit, win.
- [ ] `Hud`: undo button, restart button, level number.
- [ ] `LevelComplete`: overlay with "Next" button.
- [ ] CSS-grid layout in `App.tsx`: `<Canvas>` fills, HUD overlays with safe-area insets.

**DoD:** all 5 sounds fire correctly; undo/restart work; finish a level → click "Next" → next level.

---

## Slice 6 — Levels

**Goal:** ship 10.

**Tasks:**
- [ ] Author `levels/01.json` … `10.json` per SPEC §7 progression.
- [ ] Dev-only level loader: jump to any level via URL hash (`#level=05`).
- [ ] Difficulty pass: solve each, tune.
- [ ] *(Conditional on Q4)* In-app level editor.

**DoD:** SPEC §9 satisfied — 10 ordered levels, snappy on phone, <3s load, runs in current Chrome / Safari / Firefox.
