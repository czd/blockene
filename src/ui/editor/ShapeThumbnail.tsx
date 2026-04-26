import type { PointerEvent as ReactPointerEvent } from 'react';

import type { Color } from '../../game/engine/types';
import { blockPalette } from '../../game/scene/palette';
import { transformShape } from './shapes';
import type { Shape } from './shapes';

// 2D representation of a shape. Used for toolbar thumbnails (interactive)
// and for the floating ghost that follows the pointer during drag.
export function ShapeThumbnail({
  shape,
  color,
  rotation,
  flipped,
  cellPx,
  interactive,
  onPointerDown,
}: {
  shape: Shape;
  color: Color;
  rotation: number;
  flipped: boolean;
  cellPx: number;
  interactive?: boolean;
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void;
}) {
  const cells = transformShape(shape.cells, rotation, flipped);
  const w = Math.max(...cells.map((c) => c[0])) + 1;
  const h = Math.max(...cells.map((c) => c[1])) + 1;
  const palette = blockPalette[color];
  const inset = Math.max(1, Math.round(cellPx * 0.07));
  const studR = Math.max(1, Math.round(cellPx * 0.13));

  return (
    <div
      className={`shape-thumb${interactive ? ' shape-thumb--interactive' : ''}`}
      style={{
        width: w * cellPx,
        height: h * cellPx,
        position: 'relative',
        touchAction: 'none',
      }}
      onPointerDown={onPointerDown}
    >
      {cells.map(([x, y], i) => (
        <div
          key={i}
          className="shape-thumb-cell"
          style={{
            position: 'absolute',
            left: x * cellPx + inset,
            top: y * cellPx + inset,
            width: cellPx - inset * 2,
            height: cellPx - inset * 2,
            background: palette.base,
            borderRadius: Math.max(2, Math.round(cellPx * 0.14)),
            boxShadow: `inset 0 -${Math.round(cellPx * 0.08)}px 0 ${palette.side}`,
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: studR * 2,
              height: studR * 2,
              transform: 'translate(-50%, -50%)',
              borderRadius: '50%',
              background: palette.highlight,
            }}
          />
        </div>
      ))}
    </div>
  );
}
