import type { BlockId, Cell, EngineState } from './types';

type Occupant =
  | { kind: 'wall' }
  | { kind: 'block'; blockId: BlockId };

export class Grid {
  readonly width: number;
  readonly height: number;
  private readonly occupants: Map<string, Occupant>;

  constructor(state: EngineState) {
    this.width = state.gridWidth;
    this.height = state.gridHeight;
    this.occupants = new Map();
    for (const wall of state.walls) {
      this.occupants.set(keyOf(wall), { kind: 'wall' });
    }
    for (const block of Object.values(state.blocks)) {
      for (const cell of block.cells) {
        this.occupants.set(keyOf(cell), { kind: 'block', blockId: block.id });
      }
    }
  }

  isInBounds(cell: Cell): boolean {
    return cell.x >= 0 && cell.x < this.width && cell.y >= 0 && cell.y < this.height;
  }

  isCellFree(cell: Cell, ignoreBlockId?: BlockId): boolean {
    if (!this.isInBounds(cell)) return false;
    const occ = this.occupants.get(keyOf(cell));
    if (!occ) return true;
    if (occ.kind === 'block' && occ.blockId === ignoreBlockId) return true;
    return false;
  }

  occupantAt(cell: Cell): Occupant | null {
    return this.occupants.get(keyOf(cell)) ?? null;
  }
}

function keyOf(cell: Cell): string {
  return `${cell.x},${cell.y}`;
}
