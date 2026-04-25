# Blockene — Conventions for Claude

The full game spec lives in `SPEC.md` at the repo root. **When in doubt, re-read it.** If the spec is silent or ambiguous on something, ask before implementing.

The current implementation plan lives in `PLAN.md` at the repo root. See [Working with the plan](#working-with-the-plan) below.

---

## Working with the plan

`PLAN.md` is a living document broken into vertical slices, each with a goal, file list, task checklist, and Definition of Done.

- **Read `PLAN.md` at the start of every session** to see what slice is in flight and what's next.
- **Tick boxes (`- [ ]` → `- [x]`) the moment a task completes** — don't batch updates to the end of a slice.
- **When scope expands mid-slice, add subtasks to the relevant slice** rather than carrying them in your head.
- **When an open question is answered, move it from "Open questions" to "Decisions"** with the chosen answer + one-line rationale + date.
- **When a slice's DoD is met, mark the slice ✅ before starting the next.**
- If reality diverges from the plan (a slice splits, a task turns out to be wrong, an approach changes) — **edit the plan**, don't pretend it didn't happen. The plan should always reflect the current truth.
- New slices, new open questions, and new cross-cutting decisions all get added to `PLAN.md`.

The plan and the spec are different artifacts: `SPEC.md` is the product definition (rarely changes); `PLAN.md` is the build sequence (changes constantly).

---

## Architecture rules (non-negotiable)

The hard separation between pure logic and rendering is what makes the puzzle testable and the renderer swappable. Don't bridge these layers casually.

- **`src/game/engine/`** — pure TypeScript. **No** React imports, **no** Three.js imports, **no** rendering concerns. Contains the grid model, block model, move resolver, level loader, and win-condition logic.
- **`src/game/scene/`** — all 3D rendering via `@react-three/fiber`. Reads from the engine; the engine never reads from it.
- **`src/game/input/`** — translates pointer events into engine actions (drag start, drag move, drag end). Bridges scene and engine; contains no rendering.
- **`src/game/state/`** — Zustand store. Engine logic operates on plain data structures; the store wraps them for React.
- **`src/ui/`** — non-game-world React UI (HUD, menus, modals). Not the 3D scene.
- **Engine logic must be unit-testable without a browser or DOM.** If you find yourself reaching for `window`, `document`, `THREE`, or `react` from inside `engine/`, stop and rethink.

Dependency direction:

```
ui/ ──┐
       ├──▶ state/ ──▶ engine/   (engine imports nothing from above)
scene/ ┤              ▲
       └──▶ input/ ───┘
```

---

## Tooling

- **Always use Bun.** `bun add`, `bun run`, `bunx`. **Never** `npm` or `yarn`.
- **Vite** is the dev server and bundler.
- TypeScript is strict; the engine is pure TS with no DOM types needed for its logic.

---

## Priorities (from SPEC.md §1, in order)

1. Chunky 3D block look
2. Snappy, responsive drag controls
3. Polish: sound, particles, juice
4. Level design depth — **deferred to v2**

When a tradeoff comes up, the higher priority wins.

---

## Scope discipline

- **v1 is the MVP** defined in `SPEC.md` §1: core mechanic + ~10 levels. **No** meta-progression, **no** power-ups, **no** obstacles beyond walls.
- **The deferred features list in `SPEC.md` §8 is parked, not forgotten.** Do not add timers, coins, power-ups, locked blocks, hints, star ratings, or persistence speculatively. The data model should leave room for them (e.g. blocks may carry a `type`/`modifiers` field even if only `"normal"` is used) but the runtime shouldn't reference features that don't exist.
- Don't add abstractions, error handling, or fallbacks for scenarios v1 doesn't have.
