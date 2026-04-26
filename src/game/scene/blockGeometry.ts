import type { Cell } from '../engine/types';

export type Rect = { x: number; y: number; width: number; height: number };

// Greedy top-left-first decomposition of a polyomino into axis-aligned
// rectangles. Optimal for rectangular shapes (1×N, N×1, M×N) — they collapse
// to a single rect — and good enough for L-shapes (2 rects).
export function decomposeIntoRects(cells: Cell[]): Rect[] {
  const cellSet = new Set(cells.map((c) => key(c.x, c.y)));
  const used = new Set<string>();
  const sorted = [...cells].sort((a, b) => a.y - b.y || a.x - b.x);
  const rects: Rect[] = [];

  for (const cell of sorted) {
    if (used.has(key(cell.x, cell.y))) continue;

    let width = 1;
    while (
      cellSet.has(key(cell.x + width, cell.y)) &&
      !used.has(key(cell.x + width, cell.y))
    ) {
      width++;
    }

    let height = 1;
    grow: while (true) {
      for (let dx = 0; dx < width; dx++) {
        const k = key(cell.x + dx, cell.y + height);
        if (!cellSet.has(k) || used.has(k)) break grow;
      }
      height++;
    }

    for (let dy = 0; dy < height; dy++) {
      for (let dx = 0; dx < width; dx++) {
        used.add(key(cell.x + dx, cell.y + dy));
      }
    }
    rects.push({ x: cell.x, y: cell.y, width, height });
  }

  return rects;
}

function key(x: number, y: number): string {
  return `${x},${y}`;
}
