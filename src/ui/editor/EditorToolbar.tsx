import type { Color } from '../../game/engine/types';
import { blockPalette } from '../../game/scene/palette';
import { SHAPES } from './shapes';
import type { EditorTool, Shape } from './shapes';

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

const TOOLS: { id: EditorTool; label: string }[] = [
  { id: 'wall', label: 'Wall' },
  { id: 'block', label: 'Block' },
  { id: 'door-top', label: 'Door ↑' },
  { id: 'door-right', label: 'Door →' },
  { id: 'door-bottom', label: 'Door ↓' },
  { id: 'door-left', label: 'Door ←' },
];

export function EditorToolbar({
  tool,
  color,
  shape,
  rotation,
  flipped,
  doorWidth,
  gridWidth,
  gridHeight,
  onToolChange,
  onColorChange,
  onShapeChange,
  onRotate,
  onFlip,
  onDoorWidthChange,
  onResize,
  onClear,
  onTestPlay,
  onExport,
  onImport,
  onBack,
}: {
  tool: EditorTool;
  color: Color;
  shape: Shape;
  rotation: number;
  flipped: boolean;
  doorWidth: number;
  gridWidth: number;
  gridHeight: number;
  onToolChange: (t: EditorTool) => void;
  onColorChange: (c: Color) => void;
  onShapeChange: (s: Shape) => void;
  onRotate: () => void;
  onFlip: () => void;
  onDoorWidthChange: (w: number) => void;
  onResize: (w: number, h: number) => void;
  onClear: () => void;
  onTestPlay: () => void;
  onExport: () => void;
  onImport: () => void;
  onBack: () => void;
}) {
  const isDoor = tool.startsWith('door-');

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
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`editor-btn ${tool === t.id ? 'active' : ''}`}
            onClick={() => onToolChange(t.id)}
          >
            {t.label}
          </button>
        ))}
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

      {tool === 'block' && (
        <div className="editor-row">
          <span className="editor-label">Shape</span>
          {SHAPES.map((s) => (
            <button
              key={s.name}
              type="button"
              className={`editor-btn small ${shape.name === s.name ? 'active' : ''}`}
              onClick={() => onShapeChange(s)}
            >
              {s.name}
            </button>
          ))}
          <button
            type="button"
            className="editor-btn small"
            onClick={onRotate}
            title={`Rotate (currently ${rotation * 90}°)`}
            aria-label="Rotate shape"
          >
            ↻ {rotation * 90}°
          </button>
          <button
            type="button"
            className={`editor-btn small ${flipped ? 'active' : ''}`}
            onClick={onFlip}
            title={`Flip (currently ${flipped ? 'on' : 'off'})`}
            aria-label="Flip shape"
          >
            ⇄
          </button>
        </div>
      )}

      {isDoor && (
        <div className="editor-row">
          <span className="editor-label">Door width</span>
          <input
            type="number"
            className="editor-num"
            min={1}
            max={Math.max(gridWidth, gridHeight)}
            value={doorWidth}
            onChange={(e) => onDoorWidthChange(Math.max(1, parseInt(e.target.value, 10) || 1))}
          />
        </div>
      )}
    </div>
  );
}
