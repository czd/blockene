import type { EngineState } from '../engine/types';
import { boardPalette } from './palette';

// Grid (gx, gy) maps to world (gx + 0.5, -(gy + 0.5)) — grid Y points down,
// world Y points up.
export function BoardMesh({ state }: { state: EngineState }) {
  const { gridWidth: w, gridHeight: h, walls } = state;
  const tiles = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      tiles.push(
        <mesh key={`${x},${y}`} position={[x + 0.5, -(y + 0.5), 0.001]}>
          <planeGeometry args={[0.94, 0.94]} />
          <meshStandardMaterial color={boardPalette.cell} />
        </mesh>,
      );
    }
  }

  return (
    <group>
      <mesh position={[w / 2, -h / 2, -0.05]}>
        <boxGeometry args={[w + 0.4, h + 0.4, 0.1]} />
        <meshStandardMaterial color={boardPalette.frame} />
      </mesh>
      <mesh position={[w / 2, -h / 2, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={boardPalette.base} />
      </mesh>
      {tiles}
      {walls.map((wall, i) => (
        <mesh key={`wall-${i}`} position={[wall.x + 0.5, -(wall.y + 0.5), 0.4]}>
          <boxGeometry args={[0.96, 0.96, 0.8]} />
          <meshStandardMaterial color={boardPalette.frame} />
        </mesh>
      ))}
    </group>
  );
}
