import { describe, expect, test } from 'bun:test';

import { getCells, getExtent, translate } from './Block';
import type { Block } from './types';

const sample: Block = {
  id: 'b1',
  color: 'rare-blue',
  cells: [
    { x: 1, y: 2 },
    { x: 2, y: 2 },
    { x: 1, y: 3 },
  ],
  type: 'normal',
  modifiers: [],
};

describe('Block.getCells', () => {
  test('returns the cells array', () => {
    expect(getCells(sample)).toEqual(sample.cells);
  });
});

describe('Block.translate', () => {
  test('shifts every cell by the delta', () => {
    const moved = translate(sample, 2, -1);
    expect(moved.cells).toEqual([
      { x: 3, y: 1 },
      { x: 4, y: 1 },
      { x: 3, y: 2 },
    ]);
  });

  test('does not mutate the original block', () => {
    translate(sample, 5, 5);
    expect(sample.cells[0]).toEqual({ x: 1, y: 2 });
  });

  test('preserves id, color, type, modifiers', () => {
    const moved = translate(sample, 1, 1);
    expect(moved.id).toBe('b1');
    expect(moved.color).toBe('rare-blue');
    expect(moved.type).toBe('normal');
    expect(moved.modifiers).toEqual([]);
  });
});

describe('Block.getExtent', () => {
  test('top and bottom sides return horizontal (x) extent', () => {
    expect(getExtent(sample, 'top')).toEqual({ min: 1, max: 2 });
    expect(getExtent(sample, 'bottom')).toEqual({ min: 1, max: 2 });
  });

  test('left and right sides return vertical (y) extent', () => {
    expect(getExtent(sample, 'left')).toEqual({ min: 2, max: 3 });
    expect(getExtent(sample, 'right')).toEqual({ min: 2, max: 3 });
  });

  test('handles a single-cell block', () => {
    const single: Block = {
      id: 's',
      color: 'jade',
      cells: [{ x: 4, y: 7 }],
      type: 'normal',
      modifiers: [],
    };
    expect(getExtent(single, 'top')).toEqual({ min: 4, max: 4 });
    expect(getExtent(single, 'left')).toEqual({ min: 7, max: 7 });
  });
});
