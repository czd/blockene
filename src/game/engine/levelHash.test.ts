import { describe, expect, it } from 'bun:test';

import { decodeLevel, encodeLevel, shortCode } from './levelHash';
import type { Level } from './types';

const sample: Level = {
  id: 'editor-anything',
  name: 'Across',
  gridWidth: 5,
  gridHeight: 5,
  blocks: [
    {
      id: 'b1',
      color: 'legendary-gold',
      cells: [
        [0, 0],
        [1, 0],
        [0, 1],
        [1, 1],
      ],
    },
  ],
  gates: [{ side: 'bottom', position: 1, width: 2, color: 'legendary-gold' }],
  walls: [],
};

describe('levelHash', () => {
  it('round-trips a level', () => {
    const encoded = encodeLevel(sample);
    const decoded = decodeLevel(encoded);
    expect(decoded).not.toBeNull();
    expect(decoded!.name).toBe(sample.name);
    expect(decoded!.gridWidth).toBe(sample.gridWidth);
    expect(decoded!.blocks).toEqual(sample.blocks);
    expect(decoded!.gates).toEqual(sample.gates);
    expect(decoded!.walls).toEqual(sample.walls);
  });

  it('replaces the embedded id with the deterministic short code on decode', () => {
    const decoded = decodeLevel(encodeLevel(sample));
    expect(decoded!.id).toBe(shortCode(sample));
    expect(decoded!.id).not.toBe(sample.id);
    expect(decoded!.id).toMatch(/^[0-9A-Z]{6}$/);
  });

  it('produces the same short code for the same content regardless of embedded id', () => {
    const a = shortCode({ ...sample, id: 'foo' });
    const b = shortCode({ ...sample, id: 'bar' });
    expect(a).toBe(b);
  });

  it('produces different short codes for different content', () => {
    const altered = { ...sample, gridWidth: 6 };
    expect(shortCode(altered)).not.toBe(shortCode(sample));
  });

  it('returns null on garbage input', () => {
    expect(decodeLevel('!!!')).toBeNull();
    expect(decodeLevel('')).toBeNull();
    expect(decodeLevel('definitely-not-a-compressed-level')).toBeNull();
  });

  it('produces URL-fragment-safe output (no `&`, `?`, `#`, `=`, `/`)', () => {
    const encoded = encodeLevel(sample);
    expect(encoded).not.toMatch(/[&?#=/]/);
  });

  it('compresses meaningfully — output is shorter than the JSON it represents', () => {
    const encoded = encodeLevel(sample);
    const json = JSON.stringify(sample);
    expect(encoded.length).toBeLessThan(json.length);
  });
});
