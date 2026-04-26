import { Shape } from 'three';

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

// ---------------------------------------------------------------------------
// Polyomino outline + Shape — used for unified "no internal seams" rendering.
// ---------------------------------------------------------------------------

type Dir = 0 | 1 | 2 | 3; // 0=right, 1=down, 2=left, 3=up
type OutlineVertex = { x: number; y: number; convex: boolean };

// Build a closed Shape (in world-Y-up coords) hugging the outer perimeter
// of the polyomino. Convex corners are rounded with `radius`; concave corners
// stay sharp. For a rectangular block the result is identical to a
// `RoundedBox`; for an L / T / + the body is a single seamless mesh.
export function polyominoShape(cells: Cell[], radius: number): Shape {
  const outline = polyominoOutline(cells);
  const shape = new Shape();
  const n = outline.length;
  if (n === 0) return shape;

  // Negate y because grid Y points down, world Y points up.
  const insetIn = (i: number) => offsetAlong(outline, i, i - 1, radius);
  const insetOut = (i: number) => offsetAlong(outline, i, i + 1, radius);

  const start = insetOut(0);
  shape.moveTo(start.x, -start.y);

  for (let i = 1; i <= n; i++) {
    const idx = i % n;
    const v = outline[idx];
    const entry = insetIn(idx);
    shape.lineTo(entry.x, -entry.y);
    if (v.convex) {
      const exit = insetOut(idx);
      shape.quadraticCurveTo(v.x, -v.y, exit.x, -exit.y);
    }
  }

  return shape;
}

function offsetAlong(
  outline: OutlineVertex[],
  fromIdx: number,
  toIdx: number,
  radius: number,
): { x: number; y: number } {
  const v = outline[fromIdx];
  if (!v.convex) return { x: v.x, y: v.y };
  const n = outline.length;
  const t = outline[((toIdx % n) + n) % n];
  const dx = t.x - v.x;
  const dy = t.y - v.y;
  const len = Math.hypot(dx, dy);
  if (len === 0) return { x: v.x, y: v.y };
  return { x: v.x + (dx / len) * radius, y: v.y + (dy / len) * radius };
}

function polyominoOutline(cells: Cell[]): OutlineVertex[] {
  const cellSet = new Set(cells.map((c) => key(c.x, c.y)));
  const has = (x: number, y: number) => cellSet.has(key(x, y));

  type Edge = { sx: number; sy: number; ex: number; ey: number; dir: Dir };
  const edges: Edge[] = [];
  for (const c of cells) {
    if (!has(c.x, c.y - 1)) edges.push({ sx: c.x, sy: c.y, ex: c.x + 1, ey: c.y, dir: 0 });
    if (!has(c.x + 1, c.y)) edges.push({ sx: c.x + 1, sy: c.y, ex: c.x + 1, ey: c.y + 1, dir: 1 });
    if (!has(c.x, c.y + 1)) edges.push({ sx: c.x + 1, sy: c.y + 1, ex: c.x, ey: c.y + 1, dir: 2 });
    if (!has(c.x - 1, c.y)) edges.push({ sx: c.x, sy: c.y + 1, ex: c.x, ey: c.y, dir: 3 });
  }
  if (edges.length === 0) return [];

  const edgeByStart = new Map<string, Edge>();
  for (const e of edges) edgeByStart.set(key(e.sx, e.sy), e);

  // Pick the topmost-leftmost edge as the start; that's always on the outer
  // perimeter and walks clockwise.
  const startEdge = [...edges].sort((a, b) => a.sy - b.sy || a.sx - b.sx)[0];

  const verts: { x: number; y: number; dir: Dir }[] = [];
  let cur: Edge | undefined = startEdge;
  let prevDir: Dir | null = null;
  let safety = 0;
  do {
    if (!cur) break;
    if (cur.dir !== prevDir) {
      verts.push({ x: cur.sx, y: cur.sy, dir: cur.dir });
    }
    prevDir = cur.dir;
    cur = edgeByStart.get(key(cur.ex, cur.ey));
    if (++safety > 10_000) break;
  } while (cur && cur !== startEdge);

  const result: OutlineVertex[] = [];
  for (let i = 0; i < verts.length; i++) {
    const v = verts[i];
    const inDir = i === 0 ? verts[verts.length - 1].dir : verts[i - 1].dir;
    const convex = ((v.dir - inDir + 4) % 4) === 1;
    result.push({ x: v.x, y: v.y, convex });
  }
  return result;
}

// ---------------------------------------------------------------------------
// Stud distribution — uniform across the polyomino's bounding box, masked to
// only the cells that actually exist. Eliminates the cell-seam stud gap that
// per-rect distribution leaves in non-rectangular shapes.
// ---------------------------------------------------------------------------

export function studsForCells(
  cells: Cell[],
  edgeInset: number,
): { x: number; y: number }[] {
  if (cells.length === 0) return [];
  const cellSet = new Set(cells.map((c) => key(c.x, c.y)));
  const minX = Math.min(...cells.map((c) => c.x));
  const maxX = Math.max(...cells.map((c) => c.x));
  const minY = Math.min(...cells.map((c) => c.y));
  const maxY = Math.max(...cells.map((c) => c.y));
  const w = maxX - minX + 1;
  const h = maxY - minY + 1;

  const nx = 4 * w - 1;
  const ny = 4 * h - 1;
  const stepX = (w - edgeInset * 2) / (nx - 1);
  const stepY = (h - edgeInset * 2) / (ny - 1);

  const out: { x: number; y: number }[] = [];
  for (let iy = 0; iy < ny; iy++) {
    for (let ix = 0; ix < nx; ix++) {
      const sx = minX + edgeInset + ix * stepX;
      const sy = minY + edgeInset + iy * stepY;
      const cx = Math.floor(sx);
      const cy = Math.floor(sy);
      if (cellSet.has(key(cx, cy))) {
        out.push({ x: sx, y: -sy });
      }
    }
  }
  return out;
}
