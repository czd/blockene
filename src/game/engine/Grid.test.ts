import { describe, expect, test } from 'bun:test';

import { Grid } from './Grid';
import type { EngineState } from './types';

function makeState(): EngineState {
  return {
    gridWidth: 4,
    gridHeight: 3,
    blocks: {
      b1: {
        id: 'b1',
        color: 'rare-blue',
        cells: [
          { x: 1, y: 1 },
          { x: 2, y: 1 },
        ],
        type: 'normal',
        modifiers: [],
      },
    },
    gates: [],
    walls: [{ x: 0, y: 0 }],
  };
}

describe('Grid.isInBounds', () => {
  const g = new Grid(makeState());
  test('cells inside the grid are in bounds', () => {
    expect(g.isInBounds({ x: 0, y: 0 })).toBe(true);
    expect(g.isInBounds({ x: 3, y: 2 })).toBe(true);
  });
  test('cells outside the grid are out of bounds', () => {
    expect(g.isInBounds({ x: -1, y: 0 })).toBe(false);
    expect(g.isInBounds({ x: 4, y: 0 })).toBe(false);
    expect(g.isInBounds({ x: 0, y: -1 })).toBe(false);
    expect(g.isInBounds({ x: 0, y: 3 })).toBe(false);
  });
});

describe('Grid.isCellFree', () => {
  test('empty cells are free', () => {
    const g = new Grid(makeState());
    expect(g.isCellFree({ x: 3, y: 2 })).toBe(true);
  });

  test('walls are not free', () => {
    const g = new Grid(makeState());
    expect(g.isCellFree({ x: 0, y: 0 })).toBe(false);
  });

  test('block cells are not free', () => {
    const g = new Grid(makeState());
    expect(g.isCellFree({ x: 1, y: 1 })).toBe(false);
    expect(g.isCellFree({ x: 2, y: 1 })).toBe(false);
  });

  test('ignoreBlockId lets a block see its own cells as free', () => {
    const g = new Grid(makeState());
    expect(g.isCellFree({ x: 1, y: 1 }, 'b1')).toBe(true);
    expect(g.isCellFree({ x: 2, y: 1 }, 'b1')).toBe(true);
  });

  test('ignoreBlockId does not affect walls', () => {
    const g = new Grid(makeState());
    expect(g.isCellFree({ x: 0, y: 0 }, 'b1')).toBe(false);
  });

  test('ignoreBlockId does not unblock other blocks', () => {
    const state = makeState();
    state.blocks.b2 = {
      id: 'b2',
      color: 'crimson',
      cells: [{ x: 3, y: 0 }],
      type: 'normal',
      modifiers: [],
    };
    const g = new Grid(state);
    expect(g.isCellFree({ x: 3, y: 0 }, 'b1')).toBe(false);
  });

  test('out-of-bounds cells are not free', () => {
    const g = new Grid(makeState());
    expect(g.isCellFree({ x: -1, y: 0 })).toBe(false);
    expect(g.isCellFree({ x: 4, y: 0 })).toBe(false);
  });
});
