import type { Color } from '../engine/types';

// SPEC §3 colors. Each block hue ships with a darker side shade and a
// brighter highlight for the studs / top bevel (Slice 4 uses these).
export const blockPalette: Record<Color, { base: string; side: string; highlight: string }> = {
  'rare-blue':       { base: '#3B82F6', side: '#2563EB', highlight: '#60A5FA' },
  'deep-sapphire':   { base: '#1E40AF', side: '#1E3A8A', highlight: '#3B82F6' },
  'epic-purple':     { base: '#A855F7', side: '#9333EA', highlight: '#C084FC' },
  'royal-magenta':   { base: '#C026D3', side: '#A21CAF', highlight: '#E879F9' },
  'legendary-gold':  { base: '#F59E0B', side: '#D97706', highlight: '#FCD34D' },
  'crimson':         { base: '#DC2626', side: '#B91C1C', highlight: '#F87171' },
  'jade':            { base: '#10B981', side: '#059669', highlight: '#34D399' },
  'frost-cyan':      { base: '#06B6D4', side: '#0891B2', highlight: '#22D3EE' },
};

export const boardPalette = {
  base: '#1E293B',
  frame: '#334155',
  cell: '#475569',
  hud: '#F8FAFC',
};
