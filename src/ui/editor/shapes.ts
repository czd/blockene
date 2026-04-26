export type EditorTool =
  | 'wall'
  | 'block'
  | 'gate-top'
  | 'gate-right'
  | 'gate-bottom'
  | 'gate-left';

export type Shape = { name: string; cells: [number, number][] };

export const SHAPES: Shape[] = [
  { name: '1', cells: [[0, 0]] },
  { name: '2', cells: [[0, 0], [1, 0]] },
  { name: '3', cells: [[0, 0], [1, 0], [2, 0]] },
  { name: '2×2', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { name: 'L', cells: [[0, 0], [1, 0], [0, 1]] },                       // L-tromino (3 cells)
  { name: 'L4', cells: [[0, 0], [0, 1], [0, 2], [1, 2]] },               // L-tetromino (Tetris L)
  { name: 'T', cells: [[0, 0], [1, 0], [2, 0], [1, 1]] },                // T-tetromino
  { name: '+', cells: [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]] },        // plus-pentomino
];

// Apply `rotation` quarter-turns clockwise and an optional horizontal flip
// to the shape's cell offsets, then normalize so the top-leftmost cell
// lands at (0, 0) and the result can be placed by adding an anchor cell.
export function transformShape(
  cells: [number, number][],
  rotation: number,
  flipped: boolean,
): [number, number][] {
  let out = cells;
  if (flipped) out = out.map(([x, y]) => [-x, y] as [number, number]);
  const turns = ((rotation % 4) + 4) % 4;
  for (let i = 0; i < turns; i++) {
    out = out.map(([x, y]) => [-y, x] as [number, number]);
  }
  return normalize(out);
}

function normalize(cells: [number, number][]): [number, number][] {
  if (cells.length === 0) return cells;
  const minX = Math.min(...cells.map((c) => c[0]));
  const minY = Math.min(...cells.map((c) => c[1]));
  return cells.map(([x, y]) => [x - minX, y - minY] as [number, number]);
}
