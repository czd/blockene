import { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ExtrudeGeometry, type Group, type Mesh, type MeshStandardMaterial } from 'three';

import type { Block, Side } from '../engine/types';
import type { ExitingEntry } from '../state/gameStore';
import { EXIT_ANIM_MS, useGameStore } from '../state/gameStore';
import { polyominoShape, studsForCells } from './blockGeometry';
import { blockPalette } from './palette';

const CELL_HEIGHT = 0.74;
const CORNER_RADIUS = 0.12;
const BEVEL = 0.05;
const STUD_EDGE_INSET = 0.23;
const STUD_RADIUS = 0.085;
const STUD_HEIGHT = 0.1;
const HIT_PADDING = 0.2;
const GRAB_LIFT = 0.18;

function buildBodyGeometry(cells: Block['cells']) {
  const shape = polyominoShape(cells, CORNER_RADIUS);
  return new ExtrudeGeometry(shape, {
    depth: CELL_HEIGHT - BEVEL * 2,
    bevelEnabled: true,
    bevelThickness: BEVEL,
    bevelSize: BEVEL,
    bevelOffset: -BEVEL,
    bevelSegments: 3,
    curveSegments: 8,
  });
}

export function BlockMesh({ block }: { block: Block }) {
  const groupRef = useRef<Group>(null);
  const dragging = useGameStore((s) => s.dragging);
  const beginDrag = useGameStore((s) => s.beginDrag);

  const isDragging = dragging?.blockId === block.id;
  const offset = isDragging ? dragging.resolved.delta : { x: 0, y: 0 };
  const palette = blockPalette[block.color];

  const geometry = useMemo(() => buildBodyGeometry(block.cells), [block.cells]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const studs = useMemo(
    () => studsForCells(block.cells, STUD_EDGE_INSET, STUD_RADIUS),
    [block.cells],
  );

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
      <mesh geometry={geometry} position={[0, 0, BEVEL]} castShadow receiveShadow>
        <meshStandardMaterial color={palette.base} roughness={0.55} metalness={0.05} />
      </mesh>

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
            args={[1 + HIT_PADDING, 1 + HIT_PADDING, CELL_HEIGHT + HIT_PADDING]}
          />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

const PARTICLE_COUNT = 10;
const EXIT_FLY_DISTANCE = 3;

const SIDE_VEC: Record<Side, { x: number; y: number }> = {
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function ExitingBlockMesh({ entry }: { entry: ExitingEntry }) {
  const bodyRef = useRef<Group>(null);
  const particlesRef = useRef<Group>(null);
  const palette = blockPalette[entry.block.color];

  const geometry = useMemo(() => buildBodyGeometry(entry.block.cells), [entry.block.cells]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  const flyVec = SIDE_VEC[entry.exitSide];

  // Deterministic angles + pseudo-random speed/rise so render stays pure.
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
      const dx = entry.startDelta.x + flyVec.x * t * EXIT_FLY_DISTANCE;
      const dy = entry.startDelta.y + flyVec.y * t * EXIT_FLY_DISTANCE;
      body.position.set(dx, -dy, 0);
      body.scale.setScalar(1 - t);
      body.traverse((obj) => {
        const mesh = obj as Mesh;
        const mat = mesh.material as MeshStandardMaterial | undefined;
        if (mat && 'opacity' in mat) mat.opacity = 1 - t;
      });
    }

    const pg = particlesRef.current;
    if (pg) {
      pg.position.set(
        cx + 0.5 + entry.startDelta.x,
        -(cy + 0.5) - entry.startDelta.y,
        CELL_HEIGHT / 2,
      );
      pg.children.forEach((child, i) => {
        const p = particles[i];
        const mesh = child as Mesh;
        mesh.position.set(
          Math.cos(p.angle) * p.speed * t,
          Math.sin(p.angle) * p.speed * t,
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
        <mesh geometry={geometry} position={[0, 0, BEVEL]}>
          <meshStandardMaterial color={palette.base} transparent opacity={1} />
        </mesh>
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
