import type { Block } from '../engine/types';
import { useGameStore } from '../state/gameStore';
import { blockPalette } from './palette';

export function BlockMesh({ block }: { block: Block }) {
  const dragging = useGameStore((s) => s.dragging);
  const beginDrag = useGameStore((s) => s.beginDrag);

  const isDragging = dragging?.blockId === block.id;
  const offset = isDragging ? dragging.resolved.delta : { x: 0, y: 0 };
  const palette = blockPalette[block.color];

  return (
    <group
      position={[offset.x, -offset.y, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        (e.target as Element | null)?.setPointerCapture?.(e.pointerId);
        beginDrag(block.id);
      }}
    >
      {block.cells.map((cell, i) => (
        <mesh key={i} position={[cell.x + 0.5, -(cell.y + 0.5), 0.5]} castShadow>
          <boxGeometry args={[0.92, 0.92, 0.92]} />
          <meshStandardMaterial color={palette.base} />
        </mesh>
      ))}
    </group>
  );
}
