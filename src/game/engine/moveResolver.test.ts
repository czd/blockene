import { describe, expect, test } from 'bun:test';

import { loadLevel } from './levelLoader';
import { commitMove, resolveDrag } from './moveResolver';
import type { Block, Color, Gate, EngineState, Level } from './types';

type BlockSpec = { id: string; color: Color; cells: [number, number][] };

function makeState(opts: {
  width: number;
  height: number;
  blocks?: BlockSpec[];
  walls?: [number, number][];
  gates?: Gate[];
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
    gates: opts.gates ?? [],
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
    expect(r).toEqual({ delta: { x: 0, y: 0 }, exited: false, exitSide: null });
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

  test('blocked by board edge with no gate', () => {
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

describe('resolveDrag — gates', () => {
  test('matching color and width: block exits', () => {
    const state = makeState({
      width: 3,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[1, 0]] }],
      gates: [{ side: 'top', position: 1, width: 1, color: 'jade' }],
    });
    const r = resolveDrag(state, 'b1', { x: 0, y: -2 });
    expect(r.exited).toBe(true);
  });

  test('mismatched color: edge behaves as a wall', () => {
    const state = makeState({
      width: 3,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[1, 0]] }],
      gates: [{ side: 'top', position: 1, width: 1, color: 'crimson' }],
    });
    const r = resolveDrag(state, 'b1', { x: 0, y: -2 });
    expect(r.exited).toBe(false);
    // Math.round(-0.5) === 0, so the block can sit visually at y = -0.5 while
    // its rounded cell is still on row 0; it must not advance past that.
    expect(r.delta.y).toBeGreaterThanOrEqual(-0.5);
  });

  test('gate too narrow for the block: blocked', () => {
    // 2-wide horizontal block facing a 1-wide top gate.
    const state = makeState({
      width: 4,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[1, 0], [2, 0]] }],
      gates: [{ side: 'top', position: 1, width: 1, color: 'jade' }],
    });
    const r = resolveDrag(state, 'b1', { x: 0, y: -2 });
    expect(r.exited).toBe(false);
  });

  test('gate not aligned with block column: blocked', () => {
    const state = makeState({
      width: 3,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0]] }],
      gates: [{ side: 'top', position: 2, width: 1, color: 'jade' }],
    });
    const r = resolveDrag(state, 'b1', { x: 0, y: -2 });
    expect(r.exited).toBe(false);
  });

  test('vertical line through left gate: 1-wide gate is enough', () => {
    // Vertical 1×3 block — its perpendicular extent against a left gate is 3,
    // so it needs a 3-wide left gate.
    const state = makeState({
      width: 4,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0], [0, 1], [0, 2]] }],
      gates: [{ side: 'left', position: 0, width: 3, color: 'jade' }],
    });
    const r = resolveDrag(state, 'b1', { x: -2, y: 0 });
    expect(r.exited).toBe(true);
  });

  test('vertical line through too-narrow left gate is blocked', () => {
    const state = makeState({
      width: 4,
      height: 3,
      blocks: [{ id: 'b1', color: 'jade', cells: [[0, 0], [0, 1], [0, 2]] }],
      gates: [{ side: 'left', position: 0, width: 2, color: 'jade' }],
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
      gates: [{ side: 'top', position: 1, width: 1, color: 'jade' }],
      walls: [],
    };
    const state = loadLevel(json);

    // Drag straight up across the board and out through the matching gate.
    const r = resolveDrag(state, 'b1', { x: 0, y: -5 });
    expect(r.exited).toBe(true);

    const next = commitMove(state, 'b1', r.delta, r.exited);
    expect(Object.keys(next.blocks)).toHaveLength(0);
  });
});

describe('exit ramp must be clear of other blocks', () => {
  // The bbox-empty cells that lie between the block's body and the gate need
  // to be free for an exit to fire. Cells *behind* the body (away from the
  // gate) don't count — that's what lets an upside-down T exit even when an
  // L is parked at one of its top corners.
  test('a T pointing down cannot exit when an L is parked at a gap in front of the body', () => {
    const state = makeState({
      width: 5,
      height: 8,
      blocks: [
        { id: 't', color: 'jade', cells: [[1, 5], [2, 5], [3, 5], [2, 6]] },
        // L parked at (1, 7) — empty bbox cell at the T's pre-exit position.
        { id: 'l', color: 'crimson', cells: [[0, 7], [1, 7], [0, 6]] },
      ],
      gates: [{ side: 'bottom', position: 1, width: 3, color: 'jade' }],
    });
    const r = resolveDrag(state, 't', { x: 0, y: 3 });
    expect(r.exited).toBe(false);
  });

  test('a T cannot wedge past an L by wall-sliding around the pre-exit body cell', () => {
    // L at (1, 6) — the pre-exit position's top-left body cell. If we only
    // check forward gaps, the wall-slide lets the T traverse to dx > 0.5
    // (where extent fails) and back to dx < 0.5 (where extent fits) without
    // ever physically being at the pre-exit position. The pre-exit body
    // check catches this.
    const state = makeState({
      width: 5,
      height: 8,
      blocks: [
        { id: 't', color: 'jade', cells: [[1, 5], [2, 5], [3, 5], [2, 6]] },
        { id: 'l', color: 'crimson', cells: [[1, 6], [0, 6], [0, 7]] },
      ],
      gates: [{ side: 'bottom', position: 1, width: 3, color: 'jade' }],
    });
    const r = resolveDrag(state, 't', { x: 0.4, y: 1.5 });
    expect(r.exited).toBe(false);
  });

  test('an upside-down T exits even when blocks sit at its top corners', () => {
    // Stem at top, body row at the bottom. The top corners (1, Y) and (3, Y)
    // are bounding-box gaps but they are *behind* the body in the exit
    // direction — the body sweeps away from them, not through them.
    const state = makeState({
      width: 5,
      height: 8,
      blocks: [
        { id: 't', color: 'jade', cells: [[2, 5], [1, 6], [2, 6], [3, 6]] },
        { id: 'l', color: 'crimson', cells: [[0, 5], [1, 5], [0, 6]] },
      ],
      gates: [{ side: 'bottom', position: 1, width: 3, color: 'jade' }],
    });
    const r = resolveDrag(state, 't', { x: 0, y: 3 });
    expect(r.exited).toBe(true);
  });
});

describe('Slice 3 — multi-gate levels', () => {
  test('mixed-color gates: each block exits through its matching gate', () => {
    const state = makeState({
      width: 4,
      height: 4,
      blocks: [
        { id: 'r', color: 'crimson', cells: [[0, 0]] },
        { id: 'b', color: 'rare-blue', cells: [[3, 3]] },
      ],
      gates: [
        { side: 'top', position: 0, width: 1, color: 'crimson' },
        { side: 'bottom', position: 3, width: 1, color: 'rare-blue' },
      ],
    });
    // Crimson out the top.
    const r1 = resolveDrag(state, 'r', { x: 0, y: -5 });
    expect(r1.exited).toBe(true);
    // Rare-blue out the bottom.
    const r2 = resolveDrag(state, 'b', { x: 0, y: 5 });
    expect(r2.exited).toBe(true);
  });

  test("a block does not exit through a gate of a different color", () => {
    const state = makeState({
      width: 3,
      height: 3,
      blocks: [{ id: 'r', color: 'crimson', cells: [[1, 0]] }],
      gates: [
        // Right column has the only top gate, and it is the wrong color.
        { side: 'top', position: 1, width: 1, color: 'rare-blue' },
      ],
    });
    const r = resolveDrag(state, 'r', { x: 0, y: -5 });
    expect(r.exited).toBe(false);
  });

  test('two same-color gates on the same side: each block uses its own', () => {
    // Reproduces a bug where canExitThrough only consulted the first matching
    // gate, so the column-2 block was rejected by the column-0 gate.
    const state = makeState({
      width: 4,
      height: 3,
      blocks: [
        { id: 'a', color: 'jade', cells: [[0, 0]] },
        { id: 'b', color: 'jade', cells: [[3, 0]] },
      ],
      gates: [
        { side: 'top', position: 0, width: 1, color: 'jade' },
        { side: 'top', position: 3, width: 1, color: 'jade' },
      ],
    });
    expect(resolveDrag(state, 'a', { x: 0, y: -2 }).exited).toBe(true);
    expect(resolveDrag(state, 'b', { x: 0, y: -2 }).exited).toBe(true);
  });

  test('two same-color blocks both exit through the same gate, sequentially', () => {
    let state = makeState({
      width: 3,
      height: 3,
      blocks: [
        { id: 'a', color: 'jade', cells: [[1, 0]] },
        { id: 'b', color: 'jade', cells: [[1, 1]] },
      ],
      gates: [{ side: 'top', position: 1, width: 1, color: 'jade' }],
    });
    const r1 = resolveDrag(state, 'a', { x: 0, y: -5 });
    expect(r1.exited).toBe(true);
    state = commitMove(state, 'a', r1.delta, r1.exited);
    expect(state.blocks.a).toBeUndefined();

    const r2 = resolveDrag(state, 'b', { x: 0, y: -5 });
    expect(r2.exited).toBe(true);
    state = commitMove(state, 'b', r2.delta, r2.exited);
    expect(Object.keys(state.blocks)).toHaveLength(0);
  });
});

describe('continuous drag respects the block\'s actual current position', () => {
  // Reproduces the "invisible tether" bug: after routing a block around a
  // wall, the next pointermove would walk a fresh line from the origin to
  // the new cumulative target. If that straight line clipped the wall the
  // block had already navigated past, the block snapped back.
  test('routing past a wall, then crossing back to the other side', () => {
    const state = makeState({
      width: 5,
      height: 5,
      blocks: [{ id: 'b1', color: 'jade', cells: [[2, 4]] }],
      walls: [[2, 2]],
    });
    // Up-and-right past the wall — block ends roughly above-and-right of it.
    const r1 = resolveDrag(state, 'b1', { x: 1, y: -4 });
    expect(r1.delta.x).toBeGreaterThan(0.9);
    expect(r1.delta.y).toBeLessThan(-3.5);
    // Now drag toward the cell behind the wall on the other side. Walking
    // from origin would clip (2, 2); walking from r1.delta is clear.
    const r2 = resolveDrag(state, 'b1', { x: -1, y: -3 }, r1.delta);
    expect(r2.delta.x).toBeLessThan(-0.9);
    expect(r2.delta.y).toBeLessThan(-2.9);
  });
});

describe('gates are triggers, not openings', () => {
  // The block visibly stops at the matching gate's edge cell; pushing past
  // that edge fires the exit instead of letting the block sub-cell its way
  // off-board. exitSide tells the renderer which way to fly the block out.
  test('a multi-cell block exits as soon as its leading cell would cross a matching gate', () => {
    const state = makeState({
      width: 3,
      height: 5,
      blocks: [
        {
          id: 'b',
          color: 'jade',
          cells: [[1, 0], [1, 1], [1, 2]],
        },
      ],
      gates: [{ side: 'top', position: 1, width: 1, color: 'jade' }],
    });
    const r = resolveDrag(state, 'b', { x: 0, y: -1.6 });
    expect(r.exited).toBe(true);
    expect(r.exitSide).toBe('top');
    // The achieved delta is the last in-bounds sub-cell position.
    expect(r.delta.y).toBeGreaterThanOrEqual(-0.6);
  });

  test("a block stops at the edge when the gate colour doesn't match", () => {
    const state = makeState({
      width: 3,
      height: 3,
      blocks: [{ id: 'b', color: 'jade', cells: [[1, 0]] }],
      gates: [{ side: 'top', position: 1, width: 1, color: 'crimson' }],
    });
    const r = resolveDrag(state, 'b', { x: 0, y: -2 });
    expect(r.exited).toBe(false);
    expect(r.delta.y).toBeGreaterThanOrEqual(-0.5);
  });

  test('a non-fitting block stops at the edge instead of partially crossing', () => {
    // 1×3 vertical block can't fit a 1-wide LEFT gate (vertical extent = 3).
    const state = makeState({
      width: 4,
      height: 3,
      blocks: [{ id: 'b', color: 'jade', cells: [[0, 0], [0, 1], [0, 2]] }],
      gates: [{ side: 'left', position: 0, width: 2, color: 'jade' }],
    });
    const r = resolveDrag(state, 'b', { x: -2, y: 0 });
    expect(r.exited).toBe(false);
    expect(r.delta.x).toBeGreaterThanOrEqual(-0.5);
  });
});
