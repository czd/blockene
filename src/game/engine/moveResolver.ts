import { Grid } from './Grid';
import type { Block, BlockId, Gate, EngineState, Side, Vec2 } from './types';

const STEP_SIZE = 0.1;
const EPS = 1e-9;
const MAX_ITERATIONS = 10_000;

export type ResolveResult = {
  delta: Vec2;
  exited: boolean;
  exitSide: Side | null;
};

type StepOutcome = 'valid' | 'blocked' | { exit: Side };

// Resolve a drag from `fromDelta` (the block's current sub-cell offset, or
// (0, 0) at drag start) toward `desiredDelta`. Walks in 0.1-unit sub-steps,
// supports wall-sliding on either axis. Gates are *triggers*, not openings:
// the block collides with the board edge like a wall, but a step that would
// push it past the edge through a matching gate instead reports `exited`.
//
// During a continuous drag the caller should pass the previous resolved delta
// as `fromDelta`. Walking from the *origin* on every pointermove means a
// straight line from start to a new cumulative target can clip a wall the
// block has already physically routed past — which feels like an invisible
// tether snapping it back.
export function resolveDrag(
  state: EngineState,
  blockId: BlockId,
  desiredDelta: Vec2,
  fromDelta?: Vec2,
): ResolveResult {
  const block = state.blocks[blockId];
  const startX = fromDelta?.x ?? 0;
  const startY = fromDelta?.y ?? 0;
  if (!block) {
    return { delta: { x: startX, y: startY }, exited: false, exitSide: null };
  }

  const grid = new Grid(state);
  let curX = startX;
  let curY = startY;
  let remX = desiredDelta.x - startX;
  let remY = desiredDelta.y - startY;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const dist = Math.hypot(remX, remY);
    if (dist <= EPS) break;

    const factor = Math.min(STEP_SIZE, dist) / dist;
    const sx = remX * factor;
    const sy = remY * factor;

    const full = tryStep(block, grid, state.gates, curX + sx, curY + sy);
    if (full === 'valid') {
      curX += sx;
      curY += sy;
      remX -= sx;
      remY -= sy;
      continue;
    }
    if (typeof full === 'object') {
      return { delta: { x: curX, y: curY }, exited: true, exitSide: full.exit };
    }

    // Diagonal step blocked. Try axis-aligned slides; an exit on either axis
    // counts too if the block is squarely lined up with a matching gate.
    const xStep =
      Math.abs(sx) > EPS ? tryStep(block, grid, state.gates, curX + sx, curY) : 'blocked';
    const yStep =
      Math.abs(sy) > EPS ? tryStep(block, grid, state.gates, curX, curY + sy) : 'blocked';

    if (xStep === 'valid') {
      curX += sx;
      remX -= sx;
    } else if (yStep === 'valid') {
      curY += sy;
      remY -= sy;
    } else if (typeof xStep === 'object') {
      return { delta: { x: curX, y: curY }, exited: true, exitSide: xStep.exit };
    } else if (typeof yStep === 'object') {
      return { delta: { x: curX, y: curY }, exited: true, exitSide: yStep.exit };
    } else {
      break;
    }
  }

  return { delta: { x: curX, y: curY }, exited: false, exitSide: null };
}

// Apply a finalized drag to produce a new EngineState. Removes the block on
// exit; otherwise snaps to the nearest grid cell. The resolver guarantees the
// returned non-exit delta keeps every cell in bounds, so no snap-back walk is
// needed — but we keep one as a defensive fallback.
export function commitMove(
  state: EngineState,
  blockId: BlockId,
  delta: Vec2,
  exited: boolean,
): EngineState {
  const block = state.blocks[blockId];
  if (!block) return state;

  const nextBlocks = { ...state.blocks };
  if (exited) {
    delete nextBlocks[blockId];
    return { ...state, blocks: nextBlocks };
  }

  let dx = Math.round(delta.x);
  let dy = Math.round(delta.y);
  while (!cellsAllInBounds(block, dx, dy, state.gridWidth, state.gridHeight)) {
    if (dx === 0 && dy === 0) break;
    if (Math.abs(dx) >= Math.abs(dy) && dx !== 0) {
      dx += dx > 0 ? -1 : 1;
    } else {
      dy += dy > 0 ? -1 : 1;
    }
  }
  nextBlocks[blockId] = {
    ...block,
    cells: block.cells.map((c) => ({ x: c.x + dx, y: c.y + dy })),
  };
  return { ...state, blocks: nextBlocks };
}

function cellsAllInBounds(
  block: Block,
  dx: number,
  dy: number,
  width: number,
  height: number,
): boolean {
  for (const c of block.cells) {
    const nx = c.x + dx;
    const ny = c.y + dy;
    if (nx < 0 || nx >= width || ny < 0 || ny >= height) return false;
  }
  return true;
}

// Classify a candidate sub-cell position. Three outcomes:
//   - 'valid'   : every cell is in bounds and free
//   - { exit }  : at least one cell is out of bounds, all out-of-bounds
//                 cells leave through the same matching gate, the block's
//                 perpendicular extent fits the gate, AND the gate-facing
//                 empty cells of the bounding box at the pre-exit position
//                 are clear (so a polyomino like a T can't wedge its stem
//                 through if another block is sitting in the gap)
//   - 'blocked' : anything else (wall hit, mismatched gate, corner overhang…)
function tryStep(
  block: Block,
  grid: Grid,
  gates: Gate[],
  dx: number,
  dy: number,
): StepOutcome {
  let outSide: Side | null = null;
  for (const c of block.cells) {
    const nx = Math.round(c.x + dx);
    const ny = Math.round(c.y + dy);
    if (grid.isInBounds({ x: nx, y: ny })) {
      if (!grid.isCellFree({ x: nx, y: ny }, block.id)) return 'blocked';
    } else {
      const side = sideForOutOfBounds(nx, ny, grid.width, grid.height);
      if (!side) return 'blocked';
      if (outSide === null) outSide = side;
      else if (outSide !== side) return 'blocked';
    }
  }
  if (outSide === null) return 'valid';
  if (!gateAllowsExit(block, gates, outSide, dx, dy)) return 'blocked';
  if (!exitRampClear(block, grid, outSide, dx, dy)) return 'blocked';
  return { exit: outSide };
}

const EXIT_DIR: Record<Side, { x: number; y: number }> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

// Walks back one step in the *opposite* exit direction to recover the
// block's pre-exit footprint, then verifies two things:
//   (a) every pre-exit body cell that's still in bounds is free — without
//       this, the resolver's wall-slide can route the block *around* an
//       obstacle and exit at a different sub-cell delta, even though the
//       block never actually traversed the pre-exit position cleanly;
//   (b) for each pre-exit body cell, the cell one step further toward the
//       gate (within the pre-exit bounding box) is free — these are the
//       gaps the body has to sweep through to finish exiting.
// Cells *behind* the body in the exit direction never enter the check, so
// an upside-down T whose top corners are blocked can still exit.
function exitRampClear(
  block: Block,
  grid: Grid,
  side: Side,
  dx: number,
  dy: number,
): boolean {
  const dir = EXIT_DIR[side];
  const pre = block.cells.map((c) => ({
    x: Math.round(c.x + dx) - dir.x,
    y: Math.round(c.y + dy) - dir.y,
  }));
  const bodyKeys = new Set(pre.map((c) => `${c.x},${c.y}`));
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const c of pre) {
    if (c.x < minX) minX = c.x;
    if (c.x > maxX) maxX = c.x;
    if (c.y < minY) minY = c.y;
    if (c.y > maxY) maxY = c.y;
  }
  // (a) pre-exit body cells must be free.
  for (const c of pre) {
    if (!grid.isInBounds({ x: c.x, y: c.y })) continue;
    if (!grid.isCellFree({ x: c.x, y: c.y }, block.id)) return false;
  }
  // (b) gate-facing gaps in the pre-exit bounding box must be free.
  for (const c of pre) {
    const nx = c.x + dir.x;
    const ny = c.y + dir.y;
    if (nx < minX || nx > maxX || ny < minY || ny > maxY) continue;
    if (bodyKeys.has(`${nx},${ny}`)) continue;
    if (!grid.isInBounds({ x: nx, y: ny })) continue;
    if (!grid.isCellFree({ x: nx, y: ny }, block.id)) return false;
  }
  return true;
}

function sideForOutOfBounds(
  x: number,
  y: number,
  width: number,
  height: number,
): Side | null {
  const offTop = y < 0;
  const offBottom = y >= height;
  const offLeft = x < 0;
  const offRight = x >= width;
  const count = (offTop ? 1 : 0) + (offBottom ? 1 : 0) + (offLeft ? 1 : 0) + (offRight ? 1 : 0);
  if (count !== 1) return null;
  if (offTop) return 'top';
  if (offBottom) return 'bottom';
  if (offLeft) return 'left';
  return 'right';
}

function gateAllowsExit(
  block: Block,
  gates: Gate[],
  side: Side,
  dx: number,
  dy: number,
): boolean {
  const usesX = side === 'top' || side === 'bottom';
  let min = Infinity;
  let max = -Infinity;
  for (const c of block.cells) {
    const v = usesX ? Math.round(c.x + dx) : Math.round(c.y + dy);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  for (const gate of gates) {
    if (gate.side !== side || gate.color !== block.color) continue;
    if (min >= gate.position && max <= gate.position + gate.width - 1) return true;
  }
  return false;
}
