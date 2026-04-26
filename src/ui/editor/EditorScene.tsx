import { useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { ExtrudeGeometry } from 'three';

import type { Block, EngineState } from '../../game/engine/types';
import { polyominoShape } from '../../game/scene/blockGeometry';
import { DoorMesh } from '../../game/scene/DoorMesh';
import { FitOrthoCamera } from '../../game/scene/FitOrthoCamera';
import { blockPalette, boardPalette } from '../../game/scene/palette';

const FRAME_PADDING = 0.2;
// Editor leaves slightly more room — the toolbar eats screen height and
// users want to click outside the grid for door placement.
const FIT_PAD_X = 3;
const FIT_PAD_Y = 5;

export function EditorScene({
  state,
  onWorldClick,
}: {
  state: EngineState;
  onWorldClick: (worldX: number, worldY: number) => void;
}) {
  const { gridWidth: w, gridHeight: h } = state;
  const cx = w / 2;
  const cy = h / 2;

  // The click catcher extends well past the perimeter so door placements
  // (which rely on clicks above/right/below/left of the grid) still register.
  const catcherSize = Math.max(w, h) + 6;

  return (
    <Canvas
      orthographic
      camera={{ near: 0.1, far: 100 }}
    >
      <color attach="background" args={['#0F172A']} />
      <FitOrthoCamera
        cx={cx}
        cy={cy}
        worldWidth={w + FIT_PAD_X}
        worldHeight={h + FIT_PAD_Y}
      />
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 4, 9]} intensity={0.9} color="#FEF3C7" />
      <directionalLight position={[-5, -3, 6]} intensity={0.4} color="#A5B4FC" />

      {/* Frame */}
      <mesh position={[cx, -cy, -0.06]}>
        <boxGeometry args={[w + FRAME_PADDING * 2, h + FRAME_PADDING * 2, 0.12]} />
        <meshStandardMaterial color={boardPalette.frame} />
      </mesh>
      {/* Base */}
      <mesh position={[cx, -cy, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={boardPalette.base} />
      </mesh>
      {/* Cell tiles + faint hover outlines */}
      {Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => (
          <mesh key={`tile-${x},${y}`} position={[x + 0.5, -(y + 0.5), 0.002]}>
            <planeGeometry args={[0.94, 0.94]} />
            <meshStandardMaterial color={boardPalette.cell} />
          </mesh>
        )),
      )}
      {/* Walls */}
      {state.walls.map((wall, i) => (
        <mesh key={`wall-${i}`} position={[wall.x + 0.5, -(wall.y + 0.5), 0.4]}>
          <boxGeometry args={[0.94, 0.94, 0.8]} />
          <meshStandardMaterial color={boardPalette.frame} />
        </mesh>
      ))}
      {/* Blocks (simple — no studs in editor view, but unified body shape) */}
      {Object.values(state.blocks).map((block) => (
        <EditorBlock key={block.id} block={block} />
      ))}
      {/* Doors */}
      {state.doors.map((door, i) => (
        <DoorMesh
          key={`door-${i}`}
          door={door}
          gridWidth={state.gridWidth}
          gridHeight={state.gridHeight}
        />
      ))}

      {/* Invisible click catcher — receives every click and forwards world XY. */}
      <mesh
        position={[cx, -cy, 0.005]}
        onClick={(e) => {
          e.stopPropagation();
          onWorldClick(e.point.x, e.point.y);
        }}
      >
        <planeGeometry args={[catcherSize, catcherSize]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </Canvas>
  );
}

function EditorBlock({ block }: { block: Block }) {
  const color = blockPalette[block.color].base;
  const geometry = useMemo(() => {
    const shape = polyominoShape(block.cells, 0.1);
    return new ExtrudeGeometry(shape, {
      depth: 0.7,
      bevelEnabled: false,
      curveSegments: 8,
    });
  }, [block.cells]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={[0, 0, 0]}>
      <meshStandardMaterial color={color} />
    </mesh>
  );
}
