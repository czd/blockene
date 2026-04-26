import { forwardRef, useEffect, useImperativeHandle, useMemo, useRef } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { ExtrudeGeometry, Plane, Raycaster, Vector2, Vector3 } from 'three';

import type { Block, Cell, EngineState } from '../../game/engine/types';
import { polyominoShape } from '../../game/scene/blockGeometry';
import { DoorMesh } from '../../game/scene/DoorMesh';
import { FitOrthoCamera } from '../../game/scene/FitOrthoCamera';
import { blockPalette, boardPalette } from '../../game/scene/palette';

type DropPreview = { cells: Cell[]; valid: boolean };

const FRAME_PADDING = 0.2;
const FIT_PAD_X = 3;
const FIT_PAD_Y = 5;

export type EditorSceneHandle = {
  screenToCell: (clientX: number, clientY: number) => Cell | null;
};

export const EditorScene = forwardRef<
  EditorSceneHandle,
  {
    state: EngineState;
    draggingBlockId: string | null;
    preview: DropPreview | null;
    onWorldClick: (worldX: number, worldY: number) => void;
    onBlockPointerDown: (blockId: string, clientX: number, clientY: number) => void;
  }
>(function EditorScene(
  { state, draggingBlockId, preview, onWorldClick, onBlockPointerDown },
  ref,
) {
  const { gridWidth: w, gridHeight: h } = state;
  const cx = w / 2;
  const cy = h / 2;
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
      <ScreenToCellBridge ref={ref} />
      <ambientLight intensity={0.6} />
      <directionalLight position={[6, 4, 9]} intensity={0.9} color="#FEF3C7" />
      <directionalLight position={[-5, -3, 6]} intensity={0.4} color="#A5B4FC" />

      <mesh position={[cx, -cy, -0.06]}>
        <boxGeometry args={[w + FRAME_PADDING * 2, h + FRAME_PADDING * 2, 0.12]} />
        <meshStandardMaterial color={boardPalette.frame} />
      </mesh>
      <mesh position={[cx, -cy, 0]}>
        <planeGeometry args={[w, h]} />
        <meshStandardMaterial color={boardPalette.base} />
      </mesh>
      {Array.from({ length: h }, (_, y) =>
        Array.from({ length: w }, (_, x) => (
          <mesh key={`tile-${x},${y}`} position={[x + 0.5, -(y + 0.5), 0.002]}>
            <planeGeometry args={[0.94, 0.94]} />
            <meshStandardMaterial color={boardPalette.cell} />
          </mesh>
        )),
      )}
      {state.walls.map((wall, i) => (
        <mesh key={`wall-${i}`} position={[wall.x + 0.5, -(wall.y + 0.5), 0.4]}>
          <boxGeometry args={[0.94, 0.94, 0.8]} />
          <meshStandardMaterial color={boardPalette.frame} />
        </mesh>
      ))}
      {Object.values(state.blocks).map((block) => (
        <EditorBlock
          key={block.id}
          block={block}
          dimmed={block.id === draggingBlockId}
          onPointerDown={(e) =>
            onBlockPointerDown(block.id, e.nativeEvent.clientX, e.nativeEvent.clientY)
          }
        />
      ))}
      {state.doors.map((door, i) => (
        <DoorMesh
          key={`door-${i}`}
          door={door}
          gridWidth={state.gridWidth}
          gridHeight={state.gridHeight}
        />
      ))}

      {preview &&
        preview.cells.map((c, i) => (
          <mesh
            key={`preview-${i}`}
            position={[c.x + 0.5, -(c.y + 0.5), 0.01]}
          >
            <planeGeometry args={[0.96, 0.96]} />
            <meshBasicMaterial
              color={preview.valid ? '#10b981' : '#dc2626'}
              transparent
              opacity={0.55}
              depthWrite={false}
            />
          </mesh>
        ))}

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
});

const ScreenToCellBridge = forwardRef<EditorSceneHandle>(
  function ScreenToCellBridge(_props, ref) {
    const camera = useThree((s) => s.camera);
    const gl = useThree((s) => s.gl);

    useImperativeHandle(
      ref,
      () => ({
        screenToCell(clientX, clientY) {
          const rect = gl.domElement.getBoundingClientRect();
          if (
            clientX < rect.left ||
            clientX > rect.right ||
            clientY < rect.top ||
            clientY > rect.bottom
          ) {
            return null;
          }
          const ndc = new Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            -((clientY - rect.top) / rect.height) * 2 + 1,
          );
          const raycaster = new Raycaster();
          raycaster.setFromCamera(ndc, camera);
          const target = new Vector3();
          const plane = new Plane(new Vector3(0, 0, 1), 0);
          if (!raycaster.ray.intersectPlane(plane, target)) return null;
          return { x: Math.floor(target.x), y: Math.floor(-target.y) };
        },
      }),
      [camera, gl],
    );

    return null;
  },
);

function EditorBlock({
  block,
  dimmed,
  onPointerDown,
}: {
  block: Block;
  dimmed: boolean;
  onPointerDown: (e: { nativeEvent: { clientX: number; clientY: number } }) => void;
}) {
  const color = blockPalette[block.color].base;
  const geometry = useMemo(() => {
    const shape = polyominoShape(block.cells, 0.1);
    return new ExtrudeGeometry(shape, {
      depth: 0.7,
      bevelEnabled: false,
      curveSegments: 8,
    });
  }, [block.cells]);
  const matRef = useRef<{ opacity: number; transparent: boolean } | null>(null);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    if (matRef.current) matRef.current.opacity = dimmed ? 0.25 : 1;
  }, [dimmed]);

  return (
    <mesh
      geometry={geometry}
      position={[0, 0, 0]}
      onPointerDown={(e) => {
        e.stopPropagation();
        onPointerDown({ nativeEvent: e.nativeEvent });
      }}
    >
      <meshStandardMaterial
        color={color}
        ref={(m) => {
          matRef.current = m as unknown as { opacity: number; transparent: boolean };
        }}
        transparent
        opacity={dimmed ? 0.25 : 1}
      />
    </mesh>
  );
}
