import type { PointerEvent as ReactPointerEvent } from 'react';

import type { Color, Side } from '../../game/engine/types';
import { blockPalette } from '../../game/scene/palette';
import { ShapeThumbnail } from './ShapeThumbnail';
import { SHAPES } from './shapes';
import type { Shape } from './shapes';

export type EditorMode = 'blocks' | 'walls' | 'gates';

const COLORS: Color[] = [
  'rare-blue',
  'deep-sapphire',
  'epic-purple',
  'royal-magenta',
  'legendary-gold',
  'crimson',
  'jade',
  'frost-cyan',
];

const MODE_LABELS: { id: EditorMode; label: string }[] = [
  { id: 'blocks', label: 'Blocks' },
  { id: 'walls', label: 'Walls' },
  { id: 'gates', label: 'Gates' },
];

const GATE_SIDES: { id: Side; label: string }[] = [
  { id: 'top', label: 'Top ↑' },
  { id: 'right', label: 'Right →' },
  { id: 'bottom', label: 'Bottom ↓' },
  { id: 'left', label: 'Left ←' },
];

export function EditorToolbar({
  mode,
  color,
  rotation,
  flipped,
  gateSide,
  gateWidth,
  gridWidth,
  gridHeight,
  onModeChange,
  onColorChange,
  onRotate,
  onFlip,
  onGateSideChange,
  onGateWidthChange,
  onResize,
  onClear,
  onTestPlay,
  onExport,
  onImport,
  onBack,
  onShapePointerDown,
}: {
  mode: EditorMode;
  color: Color;
  rotation: number;
  flipped: boolean;
  gateSide: Side;
  gateWidth: number;
  gridWidth: number;
  gridHeight: number;
  onModeChange: (m: EditorMode) => void;
  onColorChange: (c: Color) => void;
  onRotate: () => void;
  onFlip: () => void;
  onGateSideChange: (s: Side) => void;
  onGateWidthChange: (w: number) => void;
  onResize: (w: number, h: number) => void;
  onClear: () => void;
  onTestPlay: () => void;
  onExport: () => void;
  onImport: () => void;
  onBack: () => void;
  onShapePointerDown: (
    shape: Shape,
    e: ReactPointerEvent<HTMLDivElement>,
  ) => void;
}) {
  return (
    <div className="editor-toolbar">
      <div className="editor-row">
        <button type="button" className="editor-btn" onClick={onBack}>
          ← Back
        </button>
        <span className="editor-grid-meta">
          <input
            type="number"
            className="editor-num"
            value={gridWidth}
            min={3}
            max={12}
            onChange={(e) => onResize(parseInt(e.target.value, 10) || 3, gridHeight)}
            aria-label="Grid width"
          />
          <span className="editor-x">×</span>
          <input
            type="number"
            className="editor-num"
            value={gridHeight}
            min={3}
            max={14}
            onChange={(e) => onResize(gridWidth, parseInt(e.target.value, 10) || 3)}
            aria-label="Grid height"
          />
        </span>
        <button type="button" className="editor-btn" onClick={onClear}>
          Clear
        </button>
        <button type="button" className="editor-btn" onClick={onImport}>
          Import
        </button>
        <button type="button" className="editor-btn" onClick={onExport}>
          Export
        </button>
        <button type="button" className="editor-btn primary" onClick={onTestPlay}>
          ▶ Test play
        </button>
      </div>

      <div className="editor-row">
        <span className="editor-label">Color</span>
        {COLORS.map((c) => (
          <button
            key={c}
            type="button"
            className={`editor-swatch ${color === c ? 'active' : ''}`}
            style={{ background: blockPalette[c].base }}
            aria-label={c}
            title={c}
            onClick={() => onColorChange(c)}
          />
        ))}
      </div>

      <div className="editor-row editor-tabs">
        {MODE_LABELS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`editor-tab ${mode === t.id ? 'active' : ''}`}
            onClick={() => onModeChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {mode === 'blocks' && (
        <div className="editor-row editor-shape-row">
          <span className="editor-label">Drag a shape onto the board</span>
          <div className="editor-shapes">
            {SHAPES.map((s) => (
              <ShapeThumbnail
                key={s.name}
                shape={s}
                color={color}
                rotation={rotation}
                flipped={flipped}
                cellPx={22}
                interactive
                onPointerDown={(e) => onShapePointerDown(s, e)}
              />
            ))}
          </div>
          <div className="editor-orient">
            <button
              type="button"
              className="editor-btn small"
              onClick={onRotate}
              title="Rotate (R)"
            >
              ↻ {rotation * 90}°
            </button>
            <button
              type="button"
              className={`editor-btn small ${flipped ? 'active' : ''}`}
              onClick={onFlip}
              title="Flip (F)"
            >
              ⇄
            </button>
          </div>
        </div>
      )}

      {mode === 'walls' && (
        <div className="editor-row">
          <span className="editor-hint">Click cells on the board to add or remove walls.</span>
        </div>
      )}

      {mode === 'gates' && (
        <div className="editor-row editor-gates">
          <span className="editor-label">Side</span>
          {GATE_SIDES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`editor-btn small ${gateSide === s.id ? 'active' : ''}`}
              onClick={() => onGateSideChange(s.id)}
            >
              {s.label}
            </button>
          ))}
          <span className="editor-label">Width</span>
          <input
            type="number"
            className="editor-num"
            min={1}
            max={Math.max(gridWidth, gridHeight)}
            value={gateWidth}
            onChange={(e) =>
              onGateWidthChange(Math.max(1, parseInt(e.target.value, 10) || 1))
            }
          />
          <span className="editor-hint">Click anywhere along the chosen side.</span>
        </div>
      )}
    </div>
  );
}
