import { describe, expect, test } from 'bun:test';

import { loadLevel } from './levelLoader';
import { commitMove, resolveDrag } from './moveResolver';
import type { Block, Color, Door, EngineState, Level } from './types';

type BlockSpec = { id: string; color: Color; cells: [number, number][] };

function makeState(opts: {
  width: number;
  height: number;
  blocks?: BlockSpec[];
  walls?: [number, number][];
  doors?: Door[];
}): EngineState {
  const blocks: Record<string, Block> = {};
  for (const b of opts.blocks ?? []) {
    blocks[b.id] = {
      id: b.id,
      color: b.color,
      cells: b.cells.map(([x, y]) => ({ x, y })),
      type: 'normal',
      modifiers: [],
    };
  }
  return {
    gridWidth: opts.width,
    gridHeight: opts.height,
    blocks,
    walls: (opts.walls ?? []).map(([x, y]) => ({ x, y })),
    doors: opts.doors ?? [],
  };
}

describe('resolveDrag — basic motion', () => {
  test('cell-aligned move into open space reaches the desired delta', () => {
    const state = makeState({
      width: 5,
      height: 5,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0]] }],
    });
    const r = resolveDrag(state, 'b1', { x: 2, y: 0 });
    expect(r.exited).toBe(false);
    expect(r.delta.x).toBeCloseTo(2, 5);
    expect(r.delta.y).toBeCloseTo(0, 5);
  });

  test('zero delta is a no-op', () => {
    const state = makeState({
      width: 3,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[1, 1]] }],
    });
    const r = resolveDrag(state, 'b1', { x: 0, y: 0 });
    expect(r.delta).toEqual({ x: 0, y: 0 });
    expect(r.exited).toBe(false);
  });

  test('unknown block id returns zero delta', () => {
    const state = makeState({ width: 3, height: 3 });
    const r = resolveDrag(state, 'missing', { x: 1, y: 1 });
    expect(r).toEqual({ delta: { x: 0, y: 0 }, exited: false });
  });
});

describe('resolveDrag — obstacles', () => {
  test('blocked by wall stops just short of crossing the half-cell', () => {
    const state = makeState({
      width: 5,
      height: 5,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0]] }],
      walls: [[2, 0]],
    });
    const r = resolveDrag(state, 'b1', { x: 5, y: 0 });
    // Math.round flips at .5, so the block can sit visually at delta < 1.5
    // but its rounded cell is still column 1.
    expect(r.delta.x).toBeLessThan(1.5);
    expect(r.delta.x).toBeGreaterThan(1.3);
    expect(r.exited).toBe(false);
  });

  test('blocked by another block', () => {
    const state = makeState({
      width: 5,
      height: 5,
      blocks: [
        { id: 'b1', color: 'jade', cells: [[0, 0]] },
        { id: 'b2', color: 'crimson', cells: [[2, 0]] },
      ],
    });
    const r = resolveDrag(state, 'b1', { x: 5, y: 0 });
    expect(r.delta.x).toBeLessThan(1.5);
    expect(r.delta.x).toBeGreaterThan(1.3);
  });

  test('blocked by board edge with no door', () => {
    const state = makeState({
      width: 3,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[1, 1]] }],
    });
    const r = resolveDrag(state, 'b1', { x: 5, y: 0 });
    // Block at (1,1), grid width 3 — last valid cell is (2,1).
    // Block stops at delta where rounded cell is still 2 (delta.x < 1.5).
    expect(r.delta.x).toBeLessThan(1.5);
    expect(r.delta.x).toBeGreaterThan(1.3);
  });
});

describe('resolveDrag — wall slides', () => {
  test('diagonal drag into a wall slides along the unblocked axis', () => {
    // Wall blocks rightward motion at (1,0). Dragging down-right should
    // slide down past the wall, then continue right when (1,1) clears.
    const state = makeState({
      width: 5,
      height: 5,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0]] }],
      walls: [[1, 0]],
    });
    const r = resolveDrag(state, 'b1', { x: 3, y: 3 });
    // Y should advance fully (no walls below).
    expect(r.delta.y).toBeGreaterThan(2.5);
    // X should make progress past column 1 once y has cleared the wall row.
    expect(r.delta.x).toBeGreaterThan(1.0);
  });

  test('diagonal drag into a corner stops when both axes are blocked', () => {
    // 2×2 wall pocket around (0,0) traps the block: (1,0) blocks pure-x,
    // (0,1) blocks pure-y, (1,1) blocks the diagonal.
    const state = makeState({
      width: 5,
      height: 5,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0]] }],
      walls: [[1, 0], [0, 1], [1, 1]],
    });
    const r = resolveDrag(state, 'b1', { x: 3, y: 3 });
    expect(r.delta.x).toBeLessThan(0.5);
    expect(r.delta.y).toBeLessThan(0.5);
  });
});

describe('resolveDrag — no tunneling', () => {
  test('a fast flick still stops at the wall', () => {
    const state = makeState({
      width: 100,
      height: 5,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0]] }],
      walls: [[5, 0]],
    });
    const r = resolveDrag(state, 'b1', { x: 50, y: 0 });
    // Block must not jump past the wall; rounded cell stops at column 4.
    expect(r.delta.x).toBeLessThan(4.5);
    expect(r.delta.x).toBeGreaterThan(4.3);
  });
});

describe('resolveDrag — doors', () => {
  test('matching color and width: block exits', () => {
    const state = makeState({
      width: 3,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[1, 0]] }],
      doors: [{ side: 'top', position: 1, width: 1, color: 'jade' }],
    });
    const r = resolveDrag(state, 'b1', { x: 0, y: -2 });
    expect(r.exited).toBe(true);
  });

  test('mismatched color: edge behaves as a wall', () => {
    const state = makeState({
      width: 3,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[1, 0]] }],
      doors: [{ side: 'top', position: 1, width: 1, color: 'crimson' }],
    });
    const r = resolveDrag(state, 'b1', { x: 0, y: -2 });
    expect(r.exited).toBe(false);
    // Math.round(-0.5) === 0, so the block can sit visually at y = -0.5 while
    // its rounded cell is still on row 0; it must not advance past that.
    expect(r.delta.y).toBeGreaterThanOrEqual(-0.5);
  });

  test('door too narrow for the block: blocked', () => {
    // 2-wide horizontal block facing a 1-wide top door.
    const state = makeState({
      width: 4,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[1, 0], [2, 0]] }],
      doors: [{ side: 'top', position: 1, width: 1, color: 'jade' }],
    });
    const r = resolveDrag(state, 'b1', { x: 0, y: -2 });
    expect(r.exited).toBe(false);
  });

  test('door not aligned with block column: blocked', () => {
    const state = makeState({
      width: 3,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0]] }],
      doors: [{ side: 'top', position: 2, width: 1, color: 'jade' }],
    });
    const r = resolveDrag(state, 'b1', { x: 0, y: -2 });
    expect(r.exited).toBe(false);
  });

  test('vertical line through left door: 1-wide door is enough', () => {
    // Vertical 1×3 block — its perpendicular extent against a left door is 3,
    // so it needs a 3-wide left door.
    const state = makeState({
      width: 4,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0], [0, 1], [0, 2]] }],
      doors: [{ side: 'left', position: 0, width: 3, color: 'jade' }],
    });
    const r = resolveDrag(state, 'b1', { x: -2, y: 0 });
    expect(r.exited).toBe(true);
  });

  test('vertical line through too-narrow left door is blocked', () => {
    const state = makeState({
      width: 4,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0], [0, 1], [0, 2]] }],
      doors: [{ side: 'left', position: 0, width: 2, color: 'jade' }],
    });
    const r = resolveDrag(state, 'b1', { x: -2, y: 0 });
    expect(r.exited).toBe(false);
  });
});

describe('commitMove', () => {
  test('snaps a sub-cell delta to integer cells', () => {
    const state = makeState({
      width: 5,
      height: 5,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0]] }],
    });
    const next = commitMove(state, 'b1', { x: 1.4, y: 0 }, false);
    expect(next.blocks.b1.cells).toEqual([{ x: 1, y: 0 }]);
  });

  test('removes the block when exited is true', () => {
    const state = makeState({
      width: 5,
      height: 5,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0]] }],
    });
    const next = commitMove(state, 'b1', { x: 0, y: -2 }, true);
    expect(next.blocks.b1).toBeUndefined();
    expect(Object.keys(next.blocks)).toEqual([]);
  });

  test('does not mutate the original state', () => {
    const state = makeState({
      width: 5,
      height: 5,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0]] }],
    });
    commitMove(state, 'b1', { x: 1, y: 0 }, false);
    expect(state.blocks.b1.cells).toEqual([{ x: 0, y: 0 }]);
  });
});

describe('end-to-end: loadLevel → resolveDrag → commitMove', () => {
  test('a JSON level can be played without any rendering layer', () => {
    const json: Level = {
      id: 'e2e',
      name: 'End to end',
      gridWidth: 4,
      gridHeight: 4,
      blocks: [{ id: 'b1', color: 'jade', cells: [[1, 3]] }],
      doors: [{ side: 'top', position: 1, width: 1, color: 'jade' }],
      walls: [],
    };
    const state = loadLevel(json);

    // Drag straight up across the board and out through the matching door.
    const r = resolveDrag(state, 'b1', { x: 0, y: -5 });
    expect(r.exited).toBe(true);

    const next = commitMove(state, 'b1', r.delta, r.exited);
    expect(Object.keys(next.blocks)).toHaveLength(0);
  });
});
