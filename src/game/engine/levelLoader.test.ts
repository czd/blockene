import { describe, expect, test } from 'bun:test';

import { loadLevel, parse } from './levelLoader';
import type { Level } from './types';

const sample: Level = {
  id: '01',
  name: 'First Steps',
  gridWidth: 6,
  gridHeight: 8,
  blocks: [
    { id: 'b1', color: 'rare-blue', cells: [[1, 2], [2, 2], [1, 3]] },
  ],
  gates: [
    { side: 'top', position: 2, width: 3, color: 'rare-blue' },
  ],
  walls: [[3, 5]],
};

describe('levelLoader.parse', () => {
  test('produces an EngineState with grid dimensions', () => {
    const s = parse(sample);
    expect(s.gridWidth).toBe(6);
    expect(s.gridHeight).toBe(8);
  });

  test('keys blocks by id and converts cells to objects', () => {
    const s = parse(sample);
    expect(Object.keys(s.blocks)).toEqual(['b1']);
    expect(s.blocks.b1.cells).toEqual([
      { x: 1, y: 2 },
      { x: 2, y: 2 },
      { x: 1, y: 3 },
    ]);
  });

  test('every block carries forward-compat type and modifiers', () => {
    const s = parse(sample);
    expect(s.blocks.b1.type).toBe('normal');
    expect(s.blocks.b1.modifiers).toEqual([]);
  });

  test('walls are converted to cell objects', () => {
    const s = parse(sample);
    expect(s.walls).toEqual([{ x: 3, y: 5 }]);
  });

  test('gates are passed through unchanged', () => {
    const s = parse(sample);
    expect(s.gates).toHaveLength(1);
    expect(s.gates[0]).toEqual({
      side: 'top',
      position: 2,
      width: 3,
      color: 'rare-blue',
    });
  });
});

describe('levelLoader.loadLevel', () => {
  test('parses a JSON string', () => {
    const s = loadLevel(JSON.stringify(sample));
    expect(s.blocks.b1.id).toBe('b1');
    expect(s.gridWidth).toBe(6);
  });

  test('passes a Level object through', () => {
    const s = loadLevel(sample);
    expect(s.gridWidth).toBe(6);
  });
});
