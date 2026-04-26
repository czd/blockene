import { describe, expect, test } from 'bun:test';

import { loadLevel } from './levelLoader';
import { emptyState, nextBlockId, resize, serialize } from './levelSerialize';
import type { Level } from './types';

const sample: Level = {
  id: '01',
  name: 'First Steps',
  gridWidth: 6,
  gridHeight: 8,
  blocks: [{ id: 'b1', color: 'rare-blue', cells: [[1, 2], [2, 2], [1, 3]] }],
  gates: [{ side: 'top', position: 2, width: 3, color: 'rare-blue' }],
  walls: [[3, 5]],
};

describe('serialize round-trips with parse', () => {
  test('parse → serialize reproduces the original JSON shape', () => {
    const state = loadLevel(sample);
    const out = serialize(state, sample.id, sample.name);
    expect(out).toEqual(sample);
  });
});

describe('emptyState', () => {
  test('produces a valid blank state', () => {
    const s = emptyState(6, 8);
    expect(s.gridWidth).toBe(6);
    expect(s.gridHeight).toBe(8);
    expect(Object.keys(s.blocks)).toHaveLength(0);
    expect(s.gates).toEqual([]);
    expect(s.walls).toEqual([]);
  });
});

describe('nextBlockId', () => {
  test('avoids collisions with existing ids', () => {
    const state = loadLevel(sample);
    const id = nextBlockId(state);
    expect(state.blocks[id]).toBeUndefined();
  });
});

describe('resize', () => {
  test('drops content that falls outside the new bounds', () => {
    const state = loadLevel({
      ...sample,
      gridWidth: 6,
      gridHeight: 8,
      blocks: [
        { id: 'a', color: 'jade', cells: [[0, 0]] },
        { id: 'b', color: 'crimson', cells: [[5, 7]] },
      ],
      walls: [[2, 2], [5, 7]],
      gates: [
        { side: 'top', position: 0, width: 2, color: 'jade' },
        { side: 'right', position: 6, width: 1, color: 'crimson' },
      ],
    });
    const next = resize(state, 4, 4);
    expect(Object.keys(next.blocks)).toEqual(['a']);
    expect(next.walls).toEqual([{ x: 2, y: 2 }]);
    // The right gate would extend beyond rows [0..3], dropped.
    expect(next.gates).toHaveLength(1);
    expect(next.gates[0].side).toBe('top');
  });
});
