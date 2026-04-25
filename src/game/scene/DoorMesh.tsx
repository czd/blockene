import type { Door } from '../engine/types';
import { blockPalette } from './palette';

// Push the tab fully outside the board frame (which extends 0.2 past the
// grid). Use a chunky size so it reads clearly at any tilt.
const FRAME_OVERHANG = 0.2;
const TAB_DEPTH = 0.7;
const TAB_HEIGHT = 0.6;
const TAB_GAP = 0.06;

export function DoorMesh({
  door,
  gridWidth,
  gridHeight,
}: {
  door: Door;
  gridWidth: number;
  gridHeight: number;
}) {
  const color = blockPalette[door.color].base;
  const span = door.width - TAB_GAP * 2;

  let x = 0;
  let y = 0;
  let sx = span;
  let sy = TAB_DEPTH;

  switch (door.side) {
    case 'top':
      x = door.position + door.width / 2;
      y = FRAME_OVERHANG + TAB_DEPTH / 2;
      sx = span;
      sy = TAB_DEPTH;
      break;
    case 'bottom':
      x = door.position + door.width / 2;
      y = -gridHeight - FRAME_OVERHANG - TAB_DEPTH / 2;
      sx = span;
      sy = TAB_DEPTH;
      break;
    case 'left':
      x = -FRAME_OVERHANG - TAB_DEPTH / 2;
      y = -(door.position + door.width / 2);
      sx = TAB_DEPTH;
      sy = span;
      break;
    case 'right':
      x = gridWidth + FRAME_OVERHANG + TAB_DEPTH / 2;
      y = -(door.position + door.width / 2);
      sx = TAB_DEPTH;
      sy = span;
      break;
  }

  return (
    <mesh position={[x, y, TAB_HEIGHT / 2]} castShadow>
      <boxGeometry args={[sx, sy, TAB_HEIGHT]} />
      <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.35} />
    </mesh>
  );
}
