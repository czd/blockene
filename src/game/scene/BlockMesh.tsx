import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import type { Group, Mesh, MeshStandardMaterial } from 'three';

import type { Block } from '../engine/types';
import type { ExitingEntry } from '../state/gameStore';
import { EXIT_ANIM_MS, useGameStore } from '../state/gameStore';
import { blockPalette } from './palette';

const CELL_BODY = 0.94;
const CELL_HEIGHT = 0.74;
const STUDS_PER_ROW = 3;
const STUD_OFFSET = 0.27;
const STUD_RADIUS = 0.085;
const STUD_HEIGHT = 0.1;
const HIT_PADDING = 0.2;
const GRAB_LIFT = 0.18;

export function BlockMesh({ block }: { block: Block }) {
  const groupRef = useRef<Group>(null);
  const dragging = useGameStore((s) => s.dragging);
  const beginDrag = useGameStore((s) => s.beginDrag);

  const isDragging = dragging?.blockId === block.id;
  const offset = isDragging ? dragging.resolved.delta : { x: 0, y: 0 };
  const palette = blockPalette[block.color];

  // Studs are pre-computed for this block's cells.
  const studs = useMemo(() => {
    const out: { x: number; y: number }[] = [];
    for (const cell of block.cells) {
      for (let sy = 0; sy < STUDS_PER_ROW; sy++) {
        for (let sx = 0; sx < STUDS_PER_ROW; sx++) {
          out.push({
            x: cell.x + 0.5 + (sx - 1) * STUD_OFFSET,
            y: -(cell.y + 0.5) + (sy - 1) * STUD_OFFSET,
          });
        }
      }
    }
    return out;
  }, [block.cells]);

  // Grab-lift: smoothly raise the block while dragging.
  useFrame(() => {
    const g = groupRef.current;
    if (!g) return;
    const targetZ = isDragging ? GRAB_LIFT : 0;
    g.position.z += (targetZ - g.position.z) * 0.25;
  });

  return (
    <group
      ref={groupRef}
      position={[offset.x, -offset.y, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        beginDrag(block.id);
      }}
    >
      {block.cells.map((cell, i) => (
        <RoundedBox
          key={`body-${i}`}
          args={[CELL_BODY, CELL_BODY, CELL_HEIGHT]}
          radius={0.08}
          smoothness={3}
          position={[cell.x + 0.5, -(cell.y + 0.5), CELL_HEIGHT / 2]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial color={palette.base} roughness={0.55} metalness={0.05} />
        </RoundedBox>
      ))}

      {studs.map((s, i) => (
        <mesh
          key={`stud-${i}`}
          position={[s.x, s.y, CELL_HEIGHT + STUD_HEIGHT / 2]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[STUD_RADIUS, STUD_RADIUS, STUD_HEIGHT, 16]} />
          <meshStandardMaterial color={palette.highlight} roughness={0.4} metalness={0.05} />
        </mesh>
      ))}

      {/* Mobile hit volume — invisible but raycastable, ~20% larger per cell. */}
      {block.cells.map((cell, i) => (
        <mesh
          key={`hit-${i}`}
          position={[cell.x + 0.5, -(cell.y + 0.5), CELL_HEIGHT / 2]}
        >
          <boxGeometry
            args={[
              CELL_BODY + HIT_PADDING,
              CELL_BODY + HIT_PADDING,
              CELL_HEIGHT + HIT_PADDING,
            ]}
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

const PARTICLE_COUNT = 10;

export function ExitingBlockMesh({ entry }: { entry: ExitingEntry }) {
  const bodyRef = useRef<Group>(null);
  const particlesRef = useRef<Group>(null);
  const palette = blockPalette[entry.block.color];

  // Deterministic angles + pseudo-random speed/rise so render stays pure.
  // The look is evenly spread sparks with slight variation per index.
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        angle: (i / PARTICLE_COUNT) * Math.PI * 2,
        speed: 0.55 + ((i * 13) % 7) * 0.06,
        rise: 0.4 + ((i * 17) % 5) * 0.07,
      })),
    [],
  );

  // Centroid of the block (used as the particle origin).
  const cx = entry.block.cells.reduce((s, c) => s + c.x, 0) / entry.block.cells.length;
  const cy = entry.block.cells.reduce((s, c) => s + c.y, 0) / entry.block.cells.length;

  useFrame(() => {
    const t = Math.min(1, (performance.now() - entry.startTime) / EXIT_ANIM_MS);

    const body = bodyRef.current;
    if (body) {
      const overshoot = 1 + t * 1.4;
      body.position.set(entry.exitDelta.x * overshoot, -entry.exitDelta.y * overshoot, 0);
      body.scale.setScalar(1 - t);
      body.traverse((obj) => {
        const mesh = obj as Mesh;
        const mat = mesh.material as MeshStandardMaterial | undefined;
        if (mat && 'opacity' in mat) mat.opacity = 1 - t;
      });
    }

    const pg = particlesRef.current;
    if (pg) {
      pg.children.forEach((child, i) => {
        const p = particles[i];
        const mesh = child as Mesh;
        mesh.position.set(
          Math.cos(p.angle) * p.speed * t,
          Math.sin(p.angle) * p.speed * t,
          // Arc up then back down: peaks around t=0.5.
          p.rise * t * (1 - t) * 4,
        );
        mesh.scale.setScalar(Math.max(0, 1 - t));
        const mat = mesh.material as MeshStandardMaterial;
        if ('opacity' in mat) mat.opacity = 1 - t;
      });
    }
  });

  return (
    <>
      <group ref={bodyRef}>
        {entry.block.cells.map((cell, i) => (
          <mesh key={i} position={[cell.x + 0.5, -(cell.y + 0.5), CELL_HEIGHT / 2]}>
            <boxGeometry args={[CELL_BODY, CELL_BODY, CELL_HEIGHT]} />
            <meshStandardMaterial color={palette.base} transparent opacity={1} />
          </mesh>
        ))}
      </group>
      <group ref={particlesRef} position={[cx + 0.5, -(cy + 0.5), CELL_HEIGHT / 2]}>
        {particles.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.06, 8, 8]} />
            <meshStandardMaterial color={palette.highlight} transparent opacity={1} />
          </mesh>
        ))}
      </group>
    </>
  );
}
