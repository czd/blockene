import type { Block, Cell, Side } from './types';

export function getCells(block: Block): Cell[] {
  return block.cells;
}

export function translate(block: Block, dx: number, dy: number): Block {
  return {
    ...block,
    cells: block.cells.map((c) => ({ x: c.x + dx, y: c.y + dy })),
  };
}

// Span perpendicular to a board side: x-range for top/bottom, y-range for left/right.
export function getExtent(block: Block, side: Side): { min: number; max: number } {
  const usesX = side === 'top' || side === 'bottom';
  let min = Infinity;
  let max = -Infinity;
  for (const c of block.cells) {
    const v = usesX ? c.x : c.y;
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}
