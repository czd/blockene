import type { Color, EngineState, Level, Wall } from './types';

// Inverse of `levelLoader.parse`: an EngineState plus a level id/name produces
// a serializable Level (with [x, y] tuples and an array-shaped blocks list).
export function serialize(state: EngineState, id: string, name: string): Level {
  return {
    id,
    name,
    gridWidth: state.gridWidth,
    gridHeight: state.gridHeight,
    blocks: Object.values(state.blocks).map((b) => ({
      id: b.id,
      color: b.color,
      cells: b.cells.map((c) => [c.x, c.y] as [number, number]),
    })),
    doors: state.doors.map((d) => ({ ...d })),
    walls: state.walls.map((w) => [w.x, w.y] as [number, number]),
  };
}

// Build an empty EngineState of the given size — useful as the editor's
// blank-slate starting point.
export function emptyState(gridWidth: number, gridHeight: number): EngineState {
  return {
    gridWidth,
    gridHeight,
    blocks: {},
    doors: [],
    walls: [],
  };
}

// Allocate a fresh block id that doesn't collide with an existing state.
export function nextBlockId(state: EngineState): string {
  let n = Object.keys(state.blocks).length + 1;
  while (state.blocks[`b${n}`]) n++;
  return `b${n}`;
}

export function colorEquals(a: Color, b: Color): boolean {
  return a === b;
}

// Resize the grid, dropping any content that falls outside the new bounds.
export function resize(state: EngineState, gridWidth: number, gridHeight: number): EngineState {
  const inBounds = (x: number, y: number) =>
    x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;

  const blocks: EngineState['blocks'] = {};
  for (const [id, b] of Object.entries(state.blocks)) {
    if (b.cells.every((c) => inBounds(c.x, c.y))) blocks[id] = b;
  }

  const walls: Wall[] = state.walls.filter((w) => inBounds(w.x, w.y));

  const doors = state.doors.filter((d) => {
    const span = d.side === 'top' || d.side === 'bottom' ? gridWidth : gridHeight;
    return d.position >= 0 && d.position + d.width <= span;
  });

  return { gridWidth, gridHeight, blocks, doors, walls };
}
