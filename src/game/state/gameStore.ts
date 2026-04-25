import { create } from 'zustand';

import { loadLevel as parseLevel } from '../engine/levelLoader';
import { commitMove, resolveDrag } from '../engine/moveResolver';
import type { ResolveResult } from '../engine/moveResolver';
import type { BlockId, EngineState, Level, Vec2 } from '../engine/types';

type DragState = {
  blockId: BlockId;
  resolved: ResolveResult;
};

type GameState = {
  state: EngineState;
  initial: EngineState | null;
  history: EngineState[];
  dragging: DragState | null;

  loadLevel: (level: Level) => void;
  beginDrag: (blockId: BlockId) => void;
  updateDrag: (desiredGridDelta: Vec2) => void;
  endDrag: () => void;
  undo: () => void;
  restart: () => void;
};

const EMPTY_STATE: EngineState = {
  gridWidth: 0,
  gridHeight: 0,
  blocks: {},
  doors: [],
  walls: [],
};

const ZERO_RESOLVED: ResolveResult = { delta: { x: 0, y: 0 }, exited: false };

export const useGameStore = create<GameState>((set, get) => ({
  state: EMPTY_STATE,
  initial: null,
  history: [],
  dragging: null,

  loadLevel(level) {
    const state = parseLevel(level);
    set({ state, initial: state, history: [], dragging: null });
  },

  beginDrag(blockId) {
    if (!get().state.blocks[blockId]) return;
    set({ dragging: { blockId, resolved: ZERO_RESOLVED } });
  },

  updateDrag(desired) {
    const { state, dragging } = get();
    if (!dragging) return;
    const resolved = resolveDrag(state, dragging.blockId, desired);
    set({ dragging: { ...dragging, resolved } });
  },

  endDrag() {
    const { state, dragging, history } = get();
    if (!dragging) return;
    const { blockId, resolved } = dragging;
    const moved =
      resolved.exited ||
      Math.round(resolved.delta.x) !== 0 ||
      Math.round(resolved.delta.y) !== 0;
    const next = commitMove(state, blockId, resolved.delta, resolved.exited);
    set({
      state: next,
      history: moved ? [...history, state] : history,
      dragging: null,
    });
  },

  undo() {
    const { history } = get();
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    set({
      state: previous,
      history: history.slice(0, -1),
      dragging: null,
    });
  },

  restart() {
    const { initial } = get();
    if (!initial) return;
    set({ state: initial, history: [], dragging: null });
  },
}));
