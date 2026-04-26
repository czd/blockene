import {
  compressToEncodedURIComponent,
  decompressFromEncodedURIComponent,
} from 'lz-string';

import type { Level } from './types';

// Deterministic 6-char base36 short code derived from the level's content.
// Display-only — it's stable for identical levels but not unique without a
// central registry. Doubles as the level id for shared levels so personal
// bests are keyed by content, not by share URL.
export function shortCode(level: Level): string {
  const body = canonicalJson(stripId(level));
  return base36Hash(body, 6).toUpperCase();
}

// LZ-string compression of a compact JSON form, in URL-safe encoding. The id
// field is stripped on encode and recomputed from content on decode, so
// `decodeLevel(encodeLevel(L)).id === shortCode(L)`.
export function encodeLevel(level: Level): string {
  const json = canonicalJson(stripId(level));
  return compressToEncodedURIComponent(json);
}

export function decodeLevel(encoded: string): Level | null {
  const json = decompressFromEncodedURIComponent(encoded);
  if (!json) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    return null;
  }
  if (!isLevelShape(parsed)) return null;
  const level = parsed as Omit<Level, 'id'>;
  return { ...level, id: shortCode({ ...level, id: '' }) };
}

// ---------- helpers ----------

function stripId<T extends { id: string }>(level: T): Omit<T, 'id'> {
  const rest: Record<string, unknown> = { ...level };
  delete rest.id;
  return rest as Omit<T, 'id'>;
}

// Keys serialized in a fixed order so the hash is stable across producers.
function canonicalJson(obj: unknown): string {
  return JSON.stringify(obj, (_key, value) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const sorted: Record<string, unknown> = {};
      for (const k of Object.keys(value as Record<string, unknown>).sort()) {
        sorted[k] = (value as Record<string, unknown>)[k];
      }
      return sorted;
    }
    return value;
  });
}

// Simple 32-bit FNV-1a hash; output as fixed-length base36.
function base36Hash(s: string, len: number): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  const u = h >>> 0;
  return u.toString(36).padStart(len, '0').slice(-len);
}

function isLevelShape(v: unknown): boolean {
  if (!v || typeof v !== 'object') return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.name === 'string' &&
    typeof o.gridWidth === 'number' &&
    typeof o.gridHeight === 'number' &&
    Array.isArray(o.blocks) &&
    Array.isArray(o.gates) &&
    Array.isArray(o.walls)
  );
}
