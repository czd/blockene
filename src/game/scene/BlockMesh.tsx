import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import type { Group, Mesh, MeshStandardMaterial } from 'three';

import type { Block } from '../engine/types';
import type { ExitingEntry } from '../state/gameStore';
import { EXIT_ANIM_MS, useGameStore } from '../state/gameStore';
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

// Visual-only twin used while a block is animating off-board after exiting.
// The engine has already removed the block; this just plays the lerp/scale/fade.
export function ExitingBlockMesh({ entry }: { entry: ExitingEntry }) {
  const groupRef = useRef<Group>(null);
  const palette = blockPalette[entry.block.color];

  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const t = Math.min(1, (performance.now() - entry.startTime) / EXIT_ANIM_MS);
    const overshoot = 1 + t * 1.4;
    g.position.set(entry.exitDelta.x * overshoot, -entry.exitDelta.y * overshoot, 0);
    g.scale.setScalar(1 - t);
    g.traverse((obj) => {
      const mesh = obj as Mesh;
      const mat = mesh.material as MeshStandardMaterial | undefined;
      if (mat && 'opacity' in mat) mat.opacity = 1 - t;
    });
  });

  return (
    <group ref={groupRef}>
      {entry.block.cells.map((cell, i) => (
        <mesh key={i} position={[cell.x + 0.5, -(cell.y + 0.5), 0.5]}>
          <boxGeometry args={[0.92, 0.92, 0.92]} />
          <meshStandardMaterial color={palette.base} transparent opacity={1} />
        </mesh>
      ))}
    </group>
  );
}
