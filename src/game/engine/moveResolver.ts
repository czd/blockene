import { Grid } from './Grid';
import type { Block, BlockId, Door, EngineState, Side, Vec2 } from './types';

const STEP_SIZE = 0.1;
const EPS = 1e-9;
const MAX_ITERATIONS = 10_000;

export type ResolveResult = {
  delta: Vec2;
  exited: boolean;
};

// Resolve a drag from the block's committed cells toward `desiredDelta` (in cell
// units). Walks in sub-cell steps, supports wall-sliding on either axis, and
// reports `exited: true` once the block has fully cleared the board through a
// matching door.
export function resolveDrag(
  state: EngineState,
  blockId: BlockId,
  desiredDelta: Vec2,
): ResolveResult {
  const block = state.blocks[blockId];
  if (!block) return { delta: { x: 0, y: 0 }, exited: false };

  const grid = new Grid(state);
  let curX = 0;
  let curY = 0;
  let remX = desiredDelta.x;
  let remY = desiredDelta.y;
  let exited = false;

  for (let i = 0; i < MAX_ITERATIONS; i++) {
    const dist = Math.hypot(remX, remY);
    if (dist <= EPS) break;

    const factor = Math.min(STEP_SIZE, dist) / dist;
    const sx = remX * factor;
    const sy = remY * factor;

    if (isPositionValid(block, grid, state.doors, curX + sx, curY + sy)) {
      curX += sx;
      curY += sy;
      remX -= sx;
      remY -= sy;
    } else {
      const xCanSlide =
        Math.abs(sx) > EPS && isPositionValid(block, grid, state.doors, curX + sx, curY);
      const yCanSlide =
        Math.abs(sy) > EPS && isPositionValid(block, grid, state.doors, curX, curY + sy);
      if (xCanSlide) {
        curX += sx;
        remX -= sx;
      } else if (yCanSlide) {
        curY += sy;
        remY -= sy;
      } else {
        break;
      }
    }

    if (isFullyExited(block, grid, curX, curY)) {
      exited = true;
      break;
    }
  }

  return { delta: { x: curX, y: curY }, exited };
}

// Apply a finalized drag to produce a new EngineState. Snaps to the nearest
// grid cell; removes the block entirely when it has exited. If the snap
// position would leave any cell out of bounds (e.g. user released mid-door),
// walks back along the dominant axis until every cell is in bounds.
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

function isPositionValid(
  block: Block,
  grid: Grid,
  doors: Door[],
  dx: number,
  dy: number,
): boolean {
  for (const c of block.cells) {
    const nx = Math.round(c.x + dx);
    const ny = Math.round(c.y + dy);
    if (grid.isInBounds({ x: nx, y: ny })) {
      if (!grid.isCellFree({ x: nx, y: ny }, block.id)) return false;
    } else {
      const side = sideForOutOfBounds(nx, ny, grid.width, grid.height);
      if (!side) return false;
      if (!canExitThrough(block, doors, side, dx, dy)) return false;
    }
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

function canExitThrough(
  block: Block,
  doors: Door[],
  side: Side,
  dx: number,
  dy: number,
): boolean {
  const door = doors.find((d) => d.side === side && d.color === block.color);
  if (!door) return false;

  const usesX = side === 'top' || side === 'bottom';
  let min = Infinity;
  let max = -Infinity;
  for (const c of block.cells) {
    const v = usesX ? Math.round(c.x + dx) : Math.round(c.y + dy);
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return min >= door.position && max <= door.position + door.width - 1;
}

function isFullyExited(block: Block, grid: Grid, dx: number, dy: number): boolean {
  for (const c of block.cells) {
    const nx = Math.round(c.x + dx);
    const ny = Math.round(c.y + dy);
    if (grid.isInBounds({ x: nx, y: ny })) return false;
  }
  return true;
}
