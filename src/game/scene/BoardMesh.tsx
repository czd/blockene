import type { EngineState } from '../engine/types';
import { boardPalette } from './palette';

const FRAME_PADDING = 0.28;
const FRAME_HEIGHT = 0.22;
const SCREW_RADIUS = 0.12;
const SCREW_HEIGHT = 0.04;
const CELL_INSET = 0.06;

export function BoardMesh({ state }: { state: EngineState }) {
  const { gridWidth: w, gridHeight: h, walls } = state;

  const tiles = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      tiles.push(
        <mesh key={`tile-${x},${y}`} position={[x + 0.5, -(y + 0.5), 0.002]}>
          <planeGeometry args={[1 - CELL_INSET * 2, 1 - CELL_INSET * 2]} />
          <meshStandardMaterial color={boardPalette.cell} roughness={0.85} />
        </mesh>,
      );
    }
  }

  const screwPositions: [number, number][] = [
    [-FRAME_PADDING * 0.55, FRAME_PADDING * 0.55],
    [w + FRAME_PADDING * 0.55, FRAME_PADDING * 0.55],
    [-FRAME_PADDING * 0.55, -h - FRAME_PADDING * 0.55],
    [w + FRAME_PADDING * 0.55, -h - FRAME_PADDING * 0.55],
  ];

  return (
    <group>
      {/* Outer frame (thick chunky base) */}
      <mesh
        position={[w / 2, -h / 2, -FRAME_HEIGHT / 2]}
        receiveShadow
      >
        <boxGeometry
          args={[w + FRAME_PADDING * 2, h + FRAME_PADDING * 2, FRAME_HEIGHT]}
        />
        <meshStandardMaterial color={boardPalette.frame} roughness={0.6} />
      </mesh>

      {/* Inner playfield (slightly recessed) */}
      <mesh position={[w / 2, -h / 2, 0]} receiveShadow>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={boardPalette.base} roughness={0.95} />
      </mesh>

      {tiles}

      {/* Screw caps on each corner */}
      {screwPositions.map(([sx, sy], i) => (
        <mesh
          key={`screw-${i}`}
          position={[sx, sy, SCREW_HEIGHT / 2]}
          rotation={[Math.PI / 2, 0, 0]}
          castShadow
        >
          <cylinderGeometry args={[SCREW_RADIUS, SCREW_RADIUS, SCREW_HEIGHT, 20]} />
          <meshStandardMaterial color="#1F2937" roughness={0.3} metalness={0.6} />
        </mesh>
      ))}

      {/* Walls */}
      {walls.map((wall, i) => (
        <mesh
          key={`wall-${i}`}
          position={[wall.x + 0.5, -(wall.y + 0.5), 0.4]}
          castShadow
          receiveShadow
        >
          <boxGeometry args={[0.94, 0.94, 0.8]} />
          <meshStandardMaterial color={boardPalette.frame} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}
