import { useCallback, useState } from 'react';

import {
  emptyState,
  nextBlockId,
  resize as resizeState,
  serialize,
} from '../../game/engine/levelSerialize';
import type { Block, Cell, Color, Door, EngineState, Side } from '../../game/engine/types';

import { EditorScene } from './EditorScene';
import { EditorToolbar } from './EditorToolbar';
import { SHAPES, transformShape } from './shapes';
import type { EditorTool, Shape } from './shapes';

const DEFAULT_GRID = { w: 6, h: 8 };

export function Editor({
  onTestPlay,
  onBack,
  initial,
}: {
  onTestPlay: (state: EngineState, meta: { id: string; name: string }) => void;
  onBack: () => void;
  initial?: { state: EngineState; id: string; name: string };
}) {
  const [state, setState] = useState<EngineState>(
    initial?.state ?? emptyState(DEFAULT_GRID.w, DEFAULT_GRID.h),
  );
  const [meta, setMeta] = useState({
    id: initial?.id ?? 'custom',
    name: initial?.name ?? 'Custom level',
  });
  const [tool, setTool] = useState<EditorTool>('wall');
  const [color, setColor] = useState<Color>('jade');
  const [shape, setShape] = useState<Shape>(SHAPES[0]);
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [doorWidth, setDoorWidth] = useState<number>(1);

  // Reset orientation when the user picks a different base shape — they
  // expect a fresh canonical orientation, not the leftover rotation/flip.
  const handleShapeChange = (next: Shape) => {
    setShape(next);
    setRotation(0);
    setFlipped(false);
  };

  const handleWorldClick = useCallback(
    (worldX: number, worldY: number) => {
      const gx = Math.floor(worldX);
      const gy = Math.floor(-worldY);
      const oriented = transformShape(shape.cells, rotation, flipped);
      setState((prev) =>
        applyClick(prev, { x: gx, y: gy }, tool, color, oriented, doorWidth),
      );
    },
    [tool, color, shape, rotation, flipped, doorWidth],
  );

  const handleResize = (w: number, h: number) => {
    const safeW = Math.max(3, Math.min(12, w));
    const safeH = Math.max(3, Math.min(14, h));
    setState((prev) => resizeState(prev, safeW, safeH));
  };

  const handleClear = () => {
    setState((prev) => emptyState(prev.gridWidth, prev.gridHeight));
  };

  const handleExport = async () => {
    const json = JSON.stringify(serialize(state, meta.id, meta.name), null, 2);
    try {
      await navigator.clipboard.writeText(json);
      alert('Level JSON copied to clipboard.');
    } catch {
      // Clipboard can fail on insecure contexts. Show in a prompt as fallback.
      window.prompt('Copy this JSON:', json);
    }
  };

  const handleImport = () => {
    const raw = window.prompt('Paste level JSON:');
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const next: EngineState = emptyState(parsed.gridWidth, parsed.gridHeight);
      for (const b of parsed.blocks ?? []) {
        next.blocks[b.id] = {
          id: b.id,
          color: b.color,
          cells: b.cells.map(([x, y]: [number, number]) => ({ x, y })),
          type: 'normal',
          modifiers: [],
        };
      }
      next.walls = (parsed.walls ?? []).map(([x, y]: [number, number]) => ({ x, y }));
      next.doors = (parsed.doors ?? []).map((d: Door) => ({ ...d }));
      setState(next);
      setMeta({ id: parsed.id ?? meta.id, name: parsed.name ?? meta.name });
    } catch (err) {
      alert(`Couldn't parse that JSON: ${(err as Error).message}`);
    }
  };

  return (
    <div className="editor">
      <EditorToolbar
        tool={tool}
        color={color}
        shape={shape}
        rotation={rotation}
        flipped={flipped}
        doorWidth={doorWidth}
        gridWidth={state.gridWidth}
        gridHeight={state.gridHeight}
        onToolChange={setTool}
        onColorChange={setColor}
        onShapeChange={handleShapeChange}
        onRotate={() => setRotation((r) => (r + 1) % 4)}
        onFlip={() => setFlipped((f) => !f)}
        onDoorWidthChange={setDoorWidth}
        onResize={handleResize}
        onClear={handleClear}
        onTestPlay={() => onTestPlay(state, meta)}
        onExport={handleExport}
        onImport={handleImport}
        onBack={onBack}
      />
      <div className="editor-canvas">
        <EditorScene state={state} onWorldClick={handleWorldClick} />
      </div>
    </div>
  );
}

// ----- Click application (pure) ------------------------------------------------

function applyClick(
  state: EngineState,
  cell: Cell,
  tool: EditorTool,
  color: Color,
  shapeCells: [number, number][],
  doorWidth: number,
): EngineState {
  if (tool === 'wall') return toggleWall(state, cell);
  if (tool === 'block') return toggleBlock(state, cell, color, shapeCells);
  if (tool.startsWith('door-')) {
    const side = tool.substring('door-'.length) as Side;
    return toggleDoor(state, cell, side, color, doorWidth);
  }
  return state;
}

function inBounds(state: EngineState, c: Cell): boolean {
  return c.x >= 0 && c.x < state.gridWidth && c.y >= 0 && c.y < state.gridHeight;
}

function wallIndexAt(state: EngineState, c: Cell): number {
  return state.walls.findIndex((w) => w.x === c.x && w.y === c.y);
}

function blockIdAt(state: EngineState, c: Cell): string | null {
  for (const b of Object.values(state.blocks)) {
    if (b.cells.some((bc) => bc.x === c.x && bc.y === c.y)) return b.id;
  }
  return null;
}

function toggleWall(state: EngineState, c: Cell): EngineState {
  if (!inBounds(state, c)) return state;
  const idx = wallIndexAt(state, c);
  if (idx >= 0) {
    const walls = [...state.walls];
    walls.splice(idx, 1);
    return { ...state, walls };
  }
  if (blockIdAt(state, c)) return state; // can't put a wall under a block
  return { ...state, walls: [...state.walls, c] };
}

function toggleBlock(
  state: EngineState,
  c: Cell,
  color: Color,
  shapeCells: [number, number][],
): EngineState {
  const existingId = blockIdAt(state, c);
  if (existingId) {
    const blocks = { ...state.blocks };
    delete blocks[existingId];
    return { ...state, blocks };
  }
  // Place: anchor the shape at the clicked cell. Reject if any target cell
  // is out of bounds, on a wall, or overlaps another block.
  const cells: Cell[] = shapeCells.map(([dx, dy]) => ({ x: c.x + dx, y: c.y + dy }));
  for (const target of cells) {
    if (!inBounds(state, target)) return state;
    if (wallIndexAt(state, target) >= 0) return state;
    if (blockIdAt(state, target)) return state;
  }
  const id = nextBlockId(state);
  const block: Block = { id, color, cells, type: 'normal', modifiers: [] };
  return { ...state, blocks: { ...state.blocks, [id]: block } };
}

function toggleDoor(
  state: EngineState,
  c: Cell,
  side: Side,
  color: Color,
  width: number,
): EngineState {
  const span = side === 'top' || side === 'bottom' ? state.gridWidth : state.gridHeight;
  const position = side === 'top' || side === 'bottom' ? c.x : c.y;
  if (position < 0 || position >= span) return state;

  // If a door on this side covers the clicked column/row, remove it.
  const existing = state.doors.findIndex(
    (d) => d.side === side && position >= d.position && position < d.position + d.width,
  );
  if (existing >= 0) {
    const doors = [...state.doors];
    doors.splice(existing, 1);
    return { ...state, doors };
  }

  // Otherwise place a new door of the configured width, clamped to the edge.
  const w = Math.max(1, Math.min(width, span - position));
  const door: Door = { side, position, width: w, color };
  return { ...state, doors: [...state.doors, door] };
}
