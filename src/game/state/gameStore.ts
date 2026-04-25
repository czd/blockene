import { create } from 'zustand';

import { loadLevel as parseLevel } from '../engine/levelLoader';
import { commitMove, resolveDrag } from '../engine/moveResolver';
import type { ResolveResult } from '../engine/moveResolver';
import type { Block, BlockId, EngineState, Level, Vec2 } from '../engine/types';

type DragState = {
  blockId: BlockId;
  resolved: ResolveResult;
};

export type ExitingEntry = {
  block: Block;
  exitDelta: Vec2;
  startTime: number;
};

export const EXIT_ANIM_MS = 450;

type GameState = {
  state: EngineState;
  initial: EngineState | null;
  history: EngineState[];
  dragging: DragState | null;
  exiting: ExitingEntry[];
  status: 'playing' | 'won';

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

function deriveStatus(state: EngineState): 'playing' | 'won' {
  return Object.keys(state.blocks).length === 0 ? 'won' : 'playing';
}

export const useGameStore = create<GameState>((set, get) => ({
  state: EMPTY_STATE,
  initial: null,
  history: [],
  dragging: null,
  exiting: [],
  status: 'playing',

  loadLevel(level) {
    const state = parseLevel(level);
    set({
      state,
      initial: state,
      history: [],
      dragging: null,
      exiting: [],
      status: deriveStatus(state),
    });
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
    const { state, dragging, history, exiting } = get();
    if (!dragging) return;
    const { blockId, resolved } = dragging;
    const block = state.blocks[blockId];
    const moved =
      resolved.exited ||
      Math.round(resolved.delta.x) !== 0 ||
      Math.round(resolved.delta.y) !== 0;
    const next = commitMove(state, blockId, resolved.delta, resolved.exited);

    const nextExiting =
      resolved.exited && block
        ? [...exiting, { block, exitDelta: resolved.delta, startTime: performance.now() }]
        : exiting;

    set({
      state: next,
      history: moved ? [...history, state] : history,
      dragging: null,
      exiting: nextExiting,
      status: deriveStatus(next),
    });

    if (resolved.exited && block) {
      setTimeout(() => {
        set((s) => ({ exiting: s.exiting.filter((e) => e.block.id !== blockId) }));
      }, EXIT_ANIM_MS);
    }
  },

  undo() {
    const { history } = get();
    if (history.length === 0) return;
    const previous = history[history.length - 1];
    set({
      state: previous,
      history: history.slice(0, -1),
      dragging: null,
      exiting: [],
      status: deriveStatus(previous),
    });
  },

  restart() {
    const { initial } = get();
    if (!initial) return;
    set({
      state: initial,
      history: [],
      dragging: null,
      exiting: [],
      status: deriveStatus(initial),
    });
  },
}));
