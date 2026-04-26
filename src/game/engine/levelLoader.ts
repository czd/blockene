import type { Block, BlockId, EngineState, Level, Wall } from './types';

export function parse(level: Level): EngineState {
  const blocks: Record<BlockId, Block> = {};
  for (const b of level.blocks) {
    blocks[b.id] = {
      id: b.id,
      color: b.color,
      cells: b.cells.map(([x, y]) => ({ x, y })),
      type: 'normal',
      modifiers: [],
    };
  }
  const walls: Wall[] = level.walls.map(([x, y]) => ({ x, y }));
  return {
    gridWidth: level.gridWidth,
    gridHeight: level.gridHeight,
    blocks,
    gates: level.gates.map((d) => ({ ...d })),
    walls,
  };
}

export function loadLevel(input: string | Level): EngineState {
  const level: Level = typeof input === 'string' ? (JSON.parse(input) as Level) : input;
  return parse(level);
}
