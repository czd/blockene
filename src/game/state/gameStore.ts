import { create } from 'zustand';

import * as audio from '../../audio/sounds';
import { loadLevel as parseLevel } from '../engine/levelLoader';
import { commitMove, resolveDrag } from '../engine/moveResolver';
import type { ResolveResult } from '../engine/moveResolver';
import type { Block, BlockId, EngineState, Level, Side, Vec2 } from '../engine/types';

export type LibraryOrigin = 'created' | 'shared';

export type LibraryEntry = {
  id: string;
  name: string;
  origin: LibraryOrigin;
  level: Level;
  addedAt: number;
};

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

export type Best = { timeMs: number; moves: number };

export const EXIT_ANIM_MS = 450;

const BESTS_KEY = 'blockene-bests';
const LIBRARY_KEY = 'blockene-library';

type GameState = {
  state: EngineState;
  initial: EngineState | null;
  history: EngineState[];
  dragging: DragState | null;
  exiting: ExitingEntry[];
  status: 'playing' | 'won';
  blocked: boolean;

  // ---- Run metrics ---------------------------------------------------------
  // Reset on loadLevel and on restart. `restarts` survives restart so the
  // player can see "you restarted N times" on the level-complete card.
  // `moves` is derived from `history.length` and not stored separately.
  currentLevelId: string | null;
  startedAt: number | null;
  solvedAt: number | null;
  undos: number;
  restarts: number;
  bests: Record<string, Best>;
  library: LibraryEntry[];
  // Whether the most recent win strictly improved each metric (not a tie).
  // Reset on loadLevel/restart; set on win.
  lastTimeRecord: boolean;
  lastMovesRecord: boolean;

  loadLevel: (level: Level) => void;
  beginDrag: (blockId: BlockId) => void;
  updateDrag: (desiredGridDelta: Vec2) => void;
  endDrag: () => void;
  undo: () => void;
  restart: () => void;
  clearBests: () => void;
  saveToLibrary: (level: Level, origin: LibraryOrigin) => void;
  removeFromLibrary: (id: string) => void;
  clearLibrary: () => void;
};

const EMPTY_STATE: EngineState = {
  gridWidth: 0,
  gridHeight: 0,
  blocks: {},
  gates: [],
  walls: [],
};

const ZERO_RESOLVED: ResolveResult = { delta: { x: 0, y: 0 }, exited: false, exitSide: null };

function deriveStatus(state: EngineState): 'playing' | 'won' {
  return Object.keys(state.blocks).length === 0 ? 'won' : 'playing';
}

function loadBests(): Record<string, Best> {
  try {
    const raw = globalThis.localStorage?.getItem(BESTS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return typeof parsed === 'object' && parsed ? parsed : {};
  } catch {
    return {};
  }
}

function saveBests(bests: Record<string, Best>): void {
  try {
    globalThis.localStorage?.setItem(BESTS_KEY, JSON.stringify(bests));
  } catch {
    // Storage might be disabled (private mode, quota); silently drop.
  }
}

function loadLibrary(): LibraryEntry[] {
  try {
    const raw = globalThis.localStorage?.getItem(LIBRARY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LibraryEntry[]) : [];
  } catch {
    return [];
  }
}

function saveLibrary(library: LibraryEntry[]): void {
  try {
    globalThis.localStorage?.setItem(LIBRARY_KEY, JSON.stringify(library));
  } catch {
    // Same fall-through as bests — silently drop.
  }
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

  currentLevelId: null,
  startedAt: null,
  solvedAt: null,
  undos: 0,
  restarts: 0,
  bests: loadBests(),
  library: loadLibrary(),
  lastTimeRecord: false,
  lastMovesRecord: false,

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
      currentLevelId: level.id,
      startedAt: null,
      solvedAt: null,
      undos: 0,
      restarts: 0,
      lastTimeRecord: false,
      lastMovesRecord: false,
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
    const resolved = resolveDrag(state, dragging.blockId, desired, dragging.resolved.delta);
    const desiredMag = Math.hypot(desired.x, desired.y);
    const resolvedMag = Math.hypot(resolved.delta.x, resolved.delta.y);
    const nowBlocked = desiredMag - resolvedMag > COLLIDE_THRESHOLD;
    if (nowBlocked && !blocked) audio.play('collide');
    set({ dragging: { ...dragging, resolved }, blocked: nowBlocked });
  },

  endDrag() {
    const {
      state,
      dragging,
      history,
      exiting,
      status: prevStatus,
      startedAt,
      solvedAt,
      currentLevelId,
      bests,
    } = get();
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
    const nextHistory = moved ? [...history, state] : history;
    const nextStartedAt = moved && startedAt === null ? performance.now() : startedAt;

    let nextSolvedAt = solvedAt;
    let nextBests = bests;
    let nextTimeRecord = false;
    let nextMovesRecord = false;
    if (nextStatus === 'won' && prevStatus !== 'won') {
      nextSolvedAt = performance.now();
      const elapsed = nextStartedAt !== null ? nextSolvedAt - nextStartedAt : 0;
      const movesDone = nextHistory.length;
      if (currentLevelId) {
        const prior = bests[currentLevelId];
        nextTimeRecord = !prior || elapsed < prior.timeMs;
        nextMovesRecord = !prior || movesDone < prior.moves;
        if (nextTimeRecord || nextMovesRecord) {
          nextBests = {
            ...bests,
            [currentLevelId]: {
              timeMs: nextTimeRecord ? elapsed : prior!.timeMs,
              moves: nextMovesRecord ? movesDone : prior!.moves,
            },
          };
          saveBests(nextBests);
        }
      }
    }

    set({
      state: next,
      history: nextHistory,
      dragging: null,
      exiting: nextExiting,
      status: nextStatus,
      blocked: false,
      startedAt: nextStartedAt,
      solvedAt: nextSolvedAt,
      bests: nextBests,
      lastTimeRecord: nextTimeRecord,
      lastMovesRecord: nextMovesRecord,
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
    const { history, undos } = get();
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
      undos: undos + 1,
    });
  },

  clearBests() {
    saveBests({});
    set({ bests: {}, lastTimeRecord: false, lastMovesRecord: false });
  },

  saveToLibrary(level, origin) {
    const lib = get().library;
    const existing = lib.findIndex((e) => e.id === level.id);
    const entry: LibraryEntry = {
      id: level.id,
      name: level.name,
      origin: existing >= 0 ? lib[existing].origin : origin,
      level,
      addedAt: existing >= 0 ? lib[existing].addedAt : Date.now(),
    };
    const next =
      existing >= 0
        ? [...lib.slice(0, existing), entry, ...lib.slice(existing + 1)]
        : [entry, ...lib];
    saveLibrary(next);
    set({ library: next });
  },

  removeFromLibrary(id) {
    const next = get().library.filter((e) => e.id !== id);
    saveLibrary(next);
    set({ library: next });
  },

  clearLibrary() {
    saveLibrary([]);
    set({ library: [] });
  },

  restart() {
    const { initial, restarts } = get();
    if (!initial) return;
    audio.stopLoop('slide');
    set({
      state: initial,
      history: [],
      dragging: null,
      exiting: [],
      status: deriveStatus(initial),
      blocked: false,
      startedAt: null,
      solvedAt: null,
      undos: 0,
      restarts: restarts + 1,
      lastTimeRecord: false,
      lastMovesRecord: false,
    });
  },
}));
