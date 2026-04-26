// Shared types for the engine. Imported by scene/, state/, input/.
// The engine never imports from above this layer.

export type Color =
  | 'rare-blue'
  | 'deep-sapphire'
  | 'epic-purple'
  | 'royal-magenta'
  | 'legendary-gold'
  | 'crimson'
  | 'jade'
  | 'frost-cyan';

export type Side = 'top' | 'right' | 'bottom' | 'left';

export type BlockId = string;

export type Cell = { x: number; y: number };

export type Vec2 = { x: number; y: number };

// Forward-compat for SPEC §8 deferred features (locked, frozen, numbered, ...).
export type BlockModifier = never;

export type Block = {
  id: BlockId;
  color: Color;
  cells: Cell[];
  type: 'normal';
  modifiers: BlockModifier[];
};

export type Gate = {
  side: Side;
  position: number;
  width: number;
  color: Color;
};

export type Wall = Cell;

export type Level = {
  id: string;
  name: string;
  gridWidth: number;
  gridHeight: number;
  blocks: Array<{
    id: BlockId;
    color: Color;
    cells: [number, number][];
  }>;
  gates: Gate[];
  walls: [number, number][];
};

export type EngineState = {
  gridWidth: number;
  gridHeight: number;
  blocks: Record<BlockId, Block>;
  gates: Gate[];
  walls: Wall[];
};
