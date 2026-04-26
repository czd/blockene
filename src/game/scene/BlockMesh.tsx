import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import type { Group, Mesh, MeshStandardMaterial } from 'three';

import type { Block, Side } from '../engine/types';
import type { ExitingEntry } from '../state/gameStore';
import { EXIT_ANIM_MS, useGameStore } from '../state/gameStore';
import { blockPalette } from './palette';
import { decomposeIntoRects } from './blockGeometry';
import type { Rect } from './blockGeometry';

const CELL_INSET = 0.03;
const CELL_HEIGHT = 0.74;
const STUD_EDGE_INSET = 0.23;
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

  // One rounded box per rectangular region — multi-cell blocks read as a
  // single chunky piece without internal seams.
  const rects = useMemo(() => decomposeIntoRects(block.cells), [block.cells]);

  // Studs flow uniformly across each rect: 4N-1 columns wide, 4M-1 rows tall
  // (3 per cell + one seam stud between each adjacent pair). For a single
  // cell that's the same 3×3 grid as before; for a 2×1 rect it adds the row
  // of studs along the seam.
  const studs = useMemo(() => studsForRects(rects), [rects]);

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
      {rects.map((r, i) => (
        <RoundedBox
          key={`body-${i}`}
          args={[r.width - CELL_INSET * 2, r.height - CELL_INSET * 2, CELL_HEIGHT]}
          radius={0.08}
          smoothness={3}
          position={[r.x + r.width / 2, -(r.y + r.height / 2), CELL_HEIGHT / 2]}
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

  const rects = useMemo(() => decomposeIntoRects(entry.block.cells), [entry.block.cells]);
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
      // Particles burst from where the block was when it triggered.
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
        {rects.map((r, i) => (
          <mesh
            key={i}
            position={[r.x + r.width / 2, -(r.y + r.height / 2), CELL_HEIGHT / 2]}
          >
            <boxGeometry
              args={[r.width - CELL_INSET * 2, r.height - CELL_INSET * 2, CELL_HEIGHT]}
            />
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

function studsForRects(rects: Rect[]): { x: number; y: number }[] {
  const out: { x: number; y: number }[] = [];
  for (const r of rects) {
    const nx = 4 * r.width - 1;
    const ny = 4 * r.height - 1;
    const stepX = (r.width - STUD_EDGE_INSET * 2) / (nx - 1);
    const stepY = (r.height - STUD_EDGE_INSET * 2) / (ny - 1);
    for (let iy = 0; iy < ny; iy++) {
      for (let ix = 0; ix < nx; ix++) {
        out.push({
          x: r.x + STUD_EDGE_INSET + ix * stepX,
          y: -(r.y + STUD_EDGE_INSET + iy * stepY),
        });
      }
    }
  }
  return out;
}
