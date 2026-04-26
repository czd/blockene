export type EditorTool =
  | 'wall'
  | 'block'
  | 'door-top'
  | 'door-right'
  | 'door-bottom'
  | 'door-left';

export type Shape = { name: string; cells: [number, number][] };

export const SHAPES: Shape[] = [
  { name: '1×1', cells: [[0, 0]] },
  { name: '2×1', cells: [[0, 0], [1, 0]] },
  { name: '1×2', cells: [[0, 0], [0, 1]] },
  { name: '3×1', cells: [[0, 0], [1, 0], [2, 0]] },
  { name: '1×3', cells: [[0, 0], [0, 1], [0, 2]] },
  { name: '2×2', cells: [[0, 0], [1, 0], [0, 1], [1, 1]] },
  { name: 'L', cells: [[0, 0], [1, 0], [0, 1]] },
];
