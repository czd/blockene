import { Canvas } from '@react-three/fiber';

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

  // Orthographic camera positioned above and slightly behind the board so the
  // view direction tilts ~20° forward (atan(4/11) ≈ 20°).
  return (
    <Canvas
      orthographic
      shadows
      camera={{
        position: [cx, -cy - 4, 11],
        zoom: 70,
        near: 0.1,
        far: 100,
      }}
      onCreated={({ camera }) => camera.lookAt(cx, -cy, 0)}
    >
      <color attach="background" args={['#0F172A']} />
      <ambientLight intensity={0.7} />
      <directionalLight position={[8, 4, 10]} intensity={0.9} castShadow />
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
      <DragController />
    </Canvas>
  );
}

function DragController() {
  useDragControls();
  return null;
}
