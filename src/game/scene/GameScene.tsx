import { Canvas } from '@react-three/fiber';
import { ContactShadows } from '@react-three/drei';

import { useDragControls } from '../input/useDragControls';
import { useGameStore } from '../state/gameStore';
import { BlockMesh, ExitingBlockMesh } from './BlockMesh';
import { BoardMesh } from './BoardMesh';
import { DoorMesh } from './DoorMesh';

export function GameScene() {
  const state = useGameStore((s) => s.state);
  const exiting = useGameStore((s) => s.exiting);
  if (state.gridWidth === 0) return null;

  const cx = state.gridWidth / 2;
  const cy = state.gridHeight / 2;
  const shadowSize = Math.max(state.gridWidth, state.gridHeight) * 1.6;

  // Orthographic camera positioned above and slightly behind the board so the
  // view direction tilts ~20° forward (atan(4/11) ≈ 20°).
  return (
    <Canvas
      orthographic
      camera={{
        position: [cx, -cy - 4, 11],
        zoom: 70,
        near: 0.1,
        far: 100,
      }}
      onCreated={({ camera }) => camera.lookAt(cx, -cy, 0)}
    >
      <color attach="background" args={['#0F172A']} />

      {/* Three-light setup: warm key from above-right + cool fill from
          below-left + ambient tint. Reads as "metallic / jewel-like" rather
          than flat. (SPEC §3 — Lighting.) */}
      <ambientLight intensity={0.45} />
      <directionalLight position={[6, 4, 9]} intensity={1.05} color="#FEF3C7" />
      <directionalLight position={[-5, -3, 6]} intensity={0.45} color="#A5B4FC" />

      <BoardMesh state={state} />
      {state.doors.map((door, i) => (
        <DoorMesh
          key={`door-${i}`}
          door={door}
          gridWidth={state.gridWidth}
          gridHeight={state.gridHeight}
        />
      ))}
      {Object.values(state.blocks).map((block) => (
        <BlockMesh key={block.id} block={block} />
      ))}
      {exiting.map((entry) => (
        <ExitingBlockMesh key={`exit-${entry.block.id}-${entry.startTime}`} entry={entry} />
      ))}

      <ContactShadows
        position={[cx, -cy, 0.005]}
        opacity={0.55}
        blur={2}
        scale={shadowSize}
        far={3}
      />

      <DragController />
    </Canvas>
  );
}

function DragController() {
  useDragControls();
  return null;
}
