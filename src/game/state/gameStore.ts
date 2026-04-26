import { create } from 'zustand';

import * as audio from '../../audio/sounds';
import { loadLevel as parseLevel } from '../engine/levelLoader';
import { commitMove, resolveDrag } from '../engine/moveResolver';
import type { ResolveResult } from '../engine/moveResolver';
import type { Block, BlockId, EngineState, Level, Side, Vec2 } from '../engine/types';

type DragState = {
  blockId: BlockId;
  resolved: ResolveResult;
};

export type ExitingEntry = {
  block: Block;
  startDelta: Vec2;
  exitSide: Side;
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
  // Tracks whether the in-flight drag was hitting a wall / another block on
  // the previous resolve. Used to fire the "collide" sound on a fresh stick.
  blocked: boolean;

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

const ZERO_RESOLVED: ResolveResult = { delta: { x: 0, y: 0 }, exited: false, exitSide: null };

function deriveStatus(state: EngineState): 'playing' | 'won' {
  return Object.keys(state.blocks).length === 0 ? 'won' : 'playing';
}

const COLLIDE_THRESHOLD = 0.15;

export const useGameStore = create<GameState>((set, get) => ({
  state: EMPTY_STATE,
  initial: null,
  history: [],
  dragging: null,
  exiting: [],
  status: 'playing',
  blocked: false,

  loadLevel(level) {
    const state = parseLevel(level);
    set({
      state,
      initial: state,
      history: [],
      dragging: null,
      exiting: [],
      status: deriveStatus(state),
      blocked: false,
    });
  },

  beginDrag(blockId) {
    if (!get().state.blocks[blockId]) return;
    set({ dragging: { blockId, resolved: ZERO_RESOLVED }, blocked: false });
    audio.play('grab');
    audio.startLoop('slide');
  },

  updateDrag(desired) {
    const { state, dragging, blocked } = get();
    if (!dragging) return;
    // Walk from the block's currently-achieved sub-cell position so the path
    // respects where the block actually is, not where it started the drag.
    const resolved = resolveDrag(state, dragging.blockId, desired, dragging.resolved.delta);
    const desiredMag = Math.hypot(desired.x, desired.y);
    const resolvedMag = Math.hypot(resolved.delta.x, resolved.delta.y);
    const nowBlocked = desiredMag - resolvedMag > COLLIDE_THRESHOLD;
    if (nowBlocked && !blocked) audio.play('collide');
    set({ dragging: { ...dragging, resolved }, blocked: nowBlocked });
  },

  endDrag() {
    const { state, dragging, history, exiting, status: prevStatus } = get();
    if (!dragging) return;
    audio.stopLoop('slide');
    const { blockId, resolved } = dragging;
    const block = state.blocks[blockId];
    const moved =
      resolved.exited ||
      Math.round(resolved.delta.x) !== 0 ||
      Math.round(resolved.delta.y) !== 0;
    const next = commitMove(state, blockId, resolved.delta, resolved.exited);

    const nextExiting =
      resolved.exited && block && resolved.exitSide
        ? [
            ...exiting,
            {
              block,
              startDelta: resolved.delta,
              exitSide: resolved.exitSide,
              startTime: performance.now(),
            },
          ]
        : exiting;
    const nextStatus = deriveStatus(next);

    set({
      state: next,
      history: moved ? [...history, state] : history,
      dragging: null,
      exiting: nextExiting,
      status: nextStatus,
      blocked: false,
    });

    if (resolved.exited) audio.play('exit');
    if (nextStatus === 'won' && prevStatus !== 'won') audio.play('win');

    if (resolved.exited && block) {
      setTimeout(() => {
        set((s) => ({ exiting: s.exiting.filter((e) => e.block.id !== blockId) }));
      }, EXIT_ANIM_MS);
    }
  },

  undo() {
    const { history } = get();
    if (history.length === 0) return;
    audio.stopLoop('slide');
    const previous = history[history.length - 1];
    set({
      state: previous,
      history: history.slice(0, -1),
      dragging: null,
      exiting: [],
      status: deriveStatus(previous),
      blocked: false,
    });
  },

  restart() {
    const { initial } = get();
    if (!initial) return;
    audio.stopLoop('slide');
    set({
      state: initial,
      history: [],
      dragging: null,
      exiting: [],
      status: deriveStatus(initial),
      blocked: false,
    });
  },
}));
