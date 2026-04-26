import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';

import {
  emptyState,
  nextBlockId,
  resize as resizeState,
  serialize,
} from '../../game/engine/levelSerialize';
import type { Block, Cell, Color, Gate, EngineState, Side } from '../../game/engine/types';

import { EditorScene } from './EditorScene';
import type { EditorSceneHandle } from './EditorScene';
import { EditorToolbar } from './EditorToolbar';
import type { EditorMode } from './EditorToolbar';
import { ShapeThumbnail } from './ShapeThumbnail';
import { transformShape } from './shapes';
import type { Shape } from './shapes';

const DEFAULT_GRID = { w: 6, h: 8 };
const DRAG_THRESHOLD_PX2 = 36; // (~6px)^2 — small enough that taps don't accidentally drag

type DragNew = {
  kind: 'new';
  shape: Shape;
  rotation: number;
  flipped: boolean;
  color: Color;
  screenX: number;
  screenY: number;
  hover: Cell | null;
};

type DragMove = {
  kind: 'move';
  blockId: string;
  screenX: number;
  screenY: number;
  hover: Cell | null;
};

type DragState = DragNew | DragMove;

export type DropPreview = { cells: Cell[]; valid: boolean };

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
  const [mode, setMode] = useState<EditorMode>('blocks');
  const [color, setColor] = useState<Color>('jade');
  const [rotation, setRotation] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [gateSide, setGateSide] = useState<Side>('top');
  const [gateWidth, setGateWidth] = useState(1);

  const [drag, setDrag] = useState<DragState | null>(null);
  // Tracks a "maybe a click on a block" — promotes to drag-move once the
  // pointer travels past a threshold, otherwise resolves as a click → delete.
  const pendingBlock = useRef<{ blockId: string; downX: number; downY: number } | null>(null);
  const sceneRef = useRef<EditorSceneHandle>(null);

  // Keyboard: R rotates, F flips, Esc cancels a drag.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        setRotation((r) => (r + 1) % 4);
      } else if (e.key === 'f' || e.key === 'F') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === 'Escape') {
        setDrag(null);
        pendingBlock.current = null;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Window-level pointer listeners. Always attached; handlers early-out when
  // there's nothing to do.
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (pendingBlock.current) {
        const { blockId, downX, downY } = pendingBlock.current;
        const dx = e.clientX - downX;
        const dy = e.clientY - downY;
        if (dx * dx + dy * dy > DRAG_THRESHOLD_PX2) {
          pendingBlock.current = null;
          setDrag({
            kind: 'move',
            blockId,
            screenX: e.clientX,
            screenY: e.clientY,
            hover: sceneRef.current?.screenToCell(e.clientX, e.clientY) ?? null,
          });
        }
        return;
      }
      setDrag((prev) => {
        if (!prev) return null;
        const hover = sceneRef.current?.screenToCell(e.clientX, e.clientY) ?? null;
        return { ...prev, screenX: e.clientX, screenY: e.clientY, hover };
      });
    };
    const onUp = (e: PointerEvent) => {
      if (drag) {
        const cell = sceneRef.current?.screenToCell(e.clientX, e.clientY) ?? null;
        if (cell) {
          if (drag.kind === 'new') {
            setState((prev) => placeNewBlock(prev, cell, drag));
          } else {
            setState((prev) => relocateBlock(prev, drag.blockId, cell));
          }
        }
        setDrag(null);
        return;
      }
      if (pendingBlock.current) {
        // Tap (no drag) on an existing block — delete it.
        const id = pendingBlock.current.blockId;
        pendingBlock.current = null;
        setState((prev) => deleteBlock(prev, id));
      }
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [drag]);

  const handleShapePointerDown = (
    shape: Shape,
    e: ReactPointerEvent<HTMLDivElement>,
  ) => {
    e.preventDefault();
    setDrag({
      kind: 'new',
      shape,
      rotation,
      flipped,
      color,
      screenX: e.clientX,
      screenY: e.clientY,
      hover: sceneRef.current?.screenToCell(e.clientX, e.clientY) ?? null,
    });
  };

  const handleBlockPointerDown = (blockId: string, clientX: number, clientY: number) => {
    if (mode !== 'blocks') return;
    pendingBlock.current = { blockId, downX: clientX, downY: clientY };
  };

  const handleCanvasClick = useCallback(
    (worldX: number, worldY: number) => {
      // Only used for click-painting walls and gates. Block placement is now
      // drag-based; block deletion happens via the block-mesh pointerdown +
      // pointerup-without-movement path.
      const gx = Math.floor(worldX);
      const gy = Math.floor(-worldY);
      if (mode === 'walls') {
        setState((prev) => toggleWall(prev, { x: gx, y: gy }));
      } else if (mode === 'gates') {
        setState((prev) => toggleGate(prev, { x: gx, y: gy }, gateSide, color, gateWidth));
      }
    },
    [mode, color, gateSide, gateWidth],
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
      next.gates = (parsed.gates ?? []).map((d: Gate) => ({ ...d }));
      setState(next);
      setMeta({ id: parsed.id ?? meta.id, name: parsed.name ?? meta.name });
    } catch (err) {
      alert(`Couldn't parse that JSON: ${(err as Error).message}`);
    }
  };

  const draggingBlockId = drag?.kind === 'move' ? drag.blockId : null;
  const preview = drag ? computePreview(state, drag) : null;

  return (
    <div className="editor">
      <EditorToolbar
        mode={mode}
        color={color}
        rotation={rotation}
        flipped={flipped}
        gateSide={gateSide}
        gateWidth={gateWidth}
        gridWidth={state.gridWidth}
        gridHeight={state.gridHeight}
        onModeChange={setMode}
        onColorChange={setColor}
        onRotate={() => setRotation((r) => (r + 1) % 4)}
        onFlip={() => setFlipped((f) => !f)}
        onGateSideChange={setGateSide}
        onGateWidthChange={setGateWidth}
        onResize={handleResize}
        onClear={handleClear}
        onTestPlay={() => onTestPlay(state, meta)}
        onExport={handleExport}
        onImport={handleImport}
        onBack={onBack}
        onShapePointerDown={handleShapePointerDown}
      />
      <div className="editor-canvas">
        <EditorScene
          ref={sceneRef}
          state={state}
          draggingBlockId={draggingBlockId}
          preview={preview}
          onWorldClick={handleCanvasClick}
          onBlockPointerDown={handleBlockPointerDown}
        />
      </div>
      {drag && <DragGhost drag={drag} state={state} />}
    </div>
  );
}

function DragGhost({ drag, state }: { drag: DragState; state: EngineState }) {
  if (drag.kind === 'new') {
    return (
      <div
        className="editor-ghost"
        style={{ left: drag.screenX, top: drag.screenY }}
      >
        <ShapeThumbnail
          shape={drag.shape}
          color={drag.color}
          rotation={drag.rotation}
          flipped={drag.flipped}
          cellPx={28}
        />
      </div>
    );
  }
  // 'move' — render the existing block's actual shape so the ghost matches.
  const block = state.blocks[drag.blockId];
  if (!block) return null;
  const minX = Math.min(...block.cells.map((c) => c.x));
  const minY = Math.min(...block.cells.map((c) => c.y));
  const offsetCells = block.cells.map(
    (c) => [c.x - minX, c.y - minY] as [number, number],
  );
  const shape: Shape = { name: '_drag', cells: offsetCells };
  return (
    <div
      className="editor-ghost"
      style={{ left: drag.screenX, top: drag.screenY }}
    >
      <ShapeThumbnail
        shape={shape}
        color={block.color}
        rotation={0}
        flipped={false}
        cellPx={28}
      />
    </div>
  );
}

function computePreview(state: EngineState, drag: DragState): DropPreview | null {
  if (!drag.hover) return null;
  const anchor = drag.hover;
  let cells: Cell[];
  let ignoreBlockId: string | null = null;
  if (drag.kind === 'new') {
    const oriented = transformShape(drag.shape.cells, drag.rotation, drag.flipped);
    cells = oriented.map(([dx, dy]) => ({ x: anchor.x + dx, y: anchor.y + dy }));
  } else {
    const block = state.blocks[drag.blockId];
    if (!block) return null;
    ignoreBlockId = block.id;
    const minX = Math.min(...block.cells.map((c) => c.x));
    const minY = Math.min(...block.cells.map((c) => c.y));
    cells = block.cells.map((c) => ({
      x: anchor.x + (c.x - minX),
      y: anchor.y + (c.y - minY),
    }));
  }
  const valid = cells.every((c) => {
    if (!inBounds(state, c)) return false;
    if (wallIndexAt(state, c) >= 0) return false;
    const occupant = blockIdAt(state, c);
    if (occupant && occupant !== ignoreBlockId) return false;
    return true;
  });
  return { cells, valid };
}

// ----- Pure level-editing helpers ---------------------------------------------

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

function placeNewBlock(state: EngineState, anchor: Cell, drag: DragNew): EngineState {
  const oriented = transformShape(drag.shape.cells, drag.rotation, drag.flipped);
  const cells: Cell[] = oriented.map(([dx, dy]) => ({
    x: anchor.x + dx,
    y: anchor.y + dy,
  }));
  for (const t of cells) {
    if (!inBounds(state, t)) return state;
    if (wallIndexAt(state, t) >= 0) return state;
    if (blockIdAt(state, t)) return state;
  }
  const id = nextBlockId(state);
  const block: Block = {
    id,
    color: drag.color,
    cells,
    type: 'normal',
    modifiers: [],
  };
  return { ...state, blocks: { ...state.blocks, [id]: block } };
}

function relocateBlock(state: EngineState, blockId: string, anchor: Cell): EngineState {
  const block = state.blocks[blockId];
  if (!block) return state;
  const minX = Math.min(...block.cells.map((c) => c.x));
  const minY = Math.min(...block.cells.map((c) => c.y));
  const newCells: Cell[] = block.cells.map((c) => ({
    x: anchor.x + (c.x - minX),
    y: anchor.y + (c.y - minY),
  }));
  for (const t of newCells) {
    if (!inBounds(state, t)) return state;
    if (wallIndexAt(state, t) >= 0) return state;
    const occupant = blockIdAt(state, t);
    if (occupant && occupant !== blockId) return state;
  }
  return {
    ...state,
    blocks: { ...state.blocks, [blockId]: { ...block, cells: newCells } },
  };
}

function deleteBlock(state: EngineState, blockId: string): EngineState {
  if (!state.blocks[blockId]) return state;
  const blocks = { ...state.blocks };
  delete blocks[blockId];
  return { ...state, blocks };
}

function toggleWall(state: EngineState, c: Cell): EngineState {
  if (!inBounds(state, c)) return state;
  const idx = wallIndexAt(state, c);
  if (idx >= 0) {
    const walls = [...state.walls];
    walls.splice(idx, 1);
    return { ...state, walls };
  }
  if (blockIdAt(state, c)) return state;
  return { ...state, walls: [...state.walls, c] };
}

function toggleGate(
  state: EngineState,
  c: Cell,
  side: Side,
  color: Color,
  width: number,
): EngineState {
  const span = side === 'top' || side === 'bottom' ? state.gridWidth : state.gridHeight;
  const position = side === 'top' || side === 'bottom' ? c.x : c.y;
  if (position < 0 || position >= span) return state;

  const existing = state.gates.findIndex(
    (d) => d.side === side && position >= d.position && position < d.position + d.width,
  );
  if (existing >= 0) {
    const gates = [...state.gates];
    gates.splice(existing, 1);
    return { ...state, gates };
  }

  const w = Math.max(1, Math.min(width, span - position));
  const gate: Gate = { side, position, width: w, color };
  return { ...state, gates: [...state.gates, gate] };
}
