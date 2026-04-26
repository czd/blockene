# Blockene — Lessons learned

Notes worth carrying to a future rewrite (different stack, native app, etc.).
This is **not** a build log or a decisions journal — `PLAN.md` covers those.
Only stack-agnostic insights belong here: how the *game* works, what feels
right, what the math actually is.

If a note is "we used drei's `RoundedBox`" or "Howler lazy-loads on first
play," it's stack-specific noise — leave it out.

---

## Mechanics

### Sub-cell stepping is non-negotiable
A drag that snap-jumps from start to target tunnels through 1-cell walls on
fast flicks. Walk in small (0.1-cell) sub-steps and validate each. Step size
is a tuning knob; smaller is safer but more expensive.

### Wall-slide via axis decomposition
When the full diagonal step fails, try x-only and y-only and take whichever
works. **Re-test each axis on every step** — never permanently disable an
axis after one failure, because walls clear partway through a slide.

### Walk from "current achieved", not from drag origin
On every pointermove during a continuous drag, the resolver must walk from
the block's *current* sub-cell position toward the new pointer target — not
from the drag's start position.

If you walk from origin, the path you re-validate every frame is a fresh
straight line from start → new cumulative target. A block the player has
*physically* routed around a wall will get yanked back the moment that
straight line clips the wall ("invisible tether" bug).

### Doors are triggers, not openings
Mental model: doors are colored walls. The block visibly **collides with the
board edge** like a wall. The act of attempting to push past the edge through
a matching door is what fires the exit — the block never sub-cell-positions
itself past the perimeter.

A step's outcome is one of: `valid` (in bounds, free), `blocked`
(wall / mismatched edge / non-fitting door), or `exit` (out-of-bounds cells
all leave through the same matching door whose extent fits the block). The
resolver returns `exited: true` plus the exit `Side` when the latter fires.

### Door fit = perpendicular extent of the *whole* block
A 3-wide horizontal block needs a 3-wide top/bottom door (matches x extent)
but only a 1-tall left/right door (matches y extent). And vice versa for a
3-tall vertical.

Check the whole block's extent, not just the leading cell.

### Multiple doors of the same color on the same side
Iterate all matching doors and accept if any one fits. Picking the *first*
one (`.find()`) silently breaks levels with two same-color doors — blocks
aligned with the second door get rejected by the first.

### Snap-back on commit (defensive)
When releasing mid-drag, the rounded delta might leave cells out of bounds.
Walk dx/dy back toward (0, 0) along the dominant axis until every cell is in
bounds. With doors-as-triggers this rarely fires (resolver guarantees
in-bounds achieved delta), but it's cheap insurance.

---

## Math

### `Math.round` is half-to-+∞ in JS
- `Math.round(0.5) === 1`
- `Math.round(-0.5) === 0` (not -1)
- `Math.round(2.5) === 3`
- `Math.round(-1.5) === -1`

This matters at sub-cell boundaries. A delta of exactly -0.5 keeps a cell on
row 0, not row -1. Tests need to assert `>=` not `>` on the boundary.

### Polyomino → rectangle decomposition
Greedy, top-left first: pick the unused cell, extend right as long as the
polyomino has it, then extend down while the entire row matches. Good enough
for puzzle-game shapes:

| Shape | Rectangles |
|-------|-----------|
| 1×N, N×1, M×N | 1 |
| L-shape | 2 |
| T, +, Z | 2-3 |

Single-rect shapes are the common case and they render seamlessly as one
rounded box. L-shapes still have one visible seam where the rects meet — fine
for v1.

### Stud distribution: 4N-1 columns across N cells
Within one cell: 3 studs at offsets `{0.23, 0.5, 0.77}` from the cell's
origin. Spacing 0.27.

Adjacent cells with that pattern leave a `0.46`-wide gap at the seam (much
larger than the within-cell spacing). To fix: distribute `4N-1` studs evenly
across an N-wide rect — the math `(N - 0.46) / (4N - 2)` lands one stud
exactly on each seam (x=1, x=2, …) with spacing very close to 0.27 for any
N.

| N | Studs (per row) | Spacing |
|---|-----------------|---------|
| 1 | 3   | 0.27 |
| 2 | 7   | 0.257 |
| 3 | 11  | 0.254 |
| 4 | 15  | 0.253 |

---

## Feel

### Grab lift magnitude
Spec said ~5% of cell height. That's barely visible at a tilted-ortho view.
We landed on ~0.18 (~24% of cell height) — "clearly hovers above the board"
reads better than "lifted a hair." Tune by sight, not by spec %.

### Exit animation
- **Direction** comes from the door's side, not from the block's traveled
  delta. A block that started right next to the door has the same fly-out
  motion as one dragged across the board.
- **Distance** is a fixed constant (~3 cell-units) over a fixed duration
  (~450 ms). Don't scale it by how far the block came.
- **Particles** emit from where the block *was* when exit fired (the
  trigger position), not from where the body ends up after lerping. They
  arc — up while flying out, down as they fade.

### Mobile hit volume per cell
Invisible mesh ~20% larger than the visible body. Critical for single-cell
blocks on touch — a fingertip won't reliably hit a 1×1 visual on a
phone-sized viewport.

Per-cell, not per-block: irregular shapes need their full footprint
grabbable.

### Three-light setup
Ambient 0.45 + warm key (~`#FEF3C7`) at intensity 1.05 from above-right + cool
fill (~`#A5B4FC`) at intensity 0.45 from below-left. The cool fill is the
secret — without it the dark sides of blocks read as gray and the whole scene
looks flat. Reads "metallic/jewel" with all three.

### Doors need to pop
Place the door tab fully outside the board's overhang (don't bury its
near-edge in the frame). Add a small `emissive` so they don't disappear under
unfavorable lighting angles — without it, the player doesn't see them and
thinks the level is broken.

---

## Architecture (engine-side)

### Pure-TS engine pays for itself by Slice 1
Keeping the engine free of rendering / DOM / framework imports made the move
resolver testable as a pure function. We have 50 unit tests covering door
fit, wall slide, tunneling, multi-door, partial exit, etc. — none of them
touch a browser. When the renderer changed (per-cell cubes → unified
rectangles) the engine didn't move.

If you rebuild on a different stack: keep the same separation. The puzzle
mechanic is portable; everything else isn't.

### Forward-compat from day one
Every block carries `type: 'normal'` and `modifiers: BlockModifier[]` even
though no other types or modifiers exist. Adding locked / frozen / numbered
blocks later is a data change, not a model change.

### Resolver returns "achieved + flags," not "next state"
`resolveDrag` returns `{ delta, exited, exitSide }`. `commitMove` is a
separate step that produces the new state. This keeps live-drag rendering
(read `delta` per frame) cheap and makes commit-on-release a deliberate moment
that can push history, fire sounds, etc.
