import { useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { Plane, Raycaster, Vector2, Vector3 } from 'three';
import type { Camera } from 'three';

import type { Vec2 } from '../engine/types';
import { useGameStore } from '../state/gameStore';

const BOARD_PLANE = new Plane(new Vector3(0, 0, 1), 0);

// Window-level pointer handler that drives a drag once the store says one
// has begun. Raycasts every move onto the board's z = 0 plane and feeds the
// store a grid-space delta (world Y is flipped to match grid Y down).
export function useDragControls() {
  const { camera, gl } = useThree();
  const dragging = useGameStore((s) => s.dragging);
  const updateDrag = useGameStore((s) => s.updateDrag);
  const endDrag = useGameStore((s) => s.endDrag);

  const start = useRef<Vec2 | null>(null);

  useEffect(() => {
    if (!dragging) {
      start.current = null;
      return;
    }
    const canvas = gl.domElement;

    const handleMove = (e: PointerEvent) => {
      const world = pointerToBoard(e, camera, canvas);
      if (!world) return;
      if (!start.current) {
        start.current = world;
        return;
      }
      updateDrag({
        x: world.x - start.current.x,
        y: -(world.y - start.current.y),
      });
    };

    const handleUp = () => endDrag();

    window.addEventListener('pointermove', handleMove);
    window.addEventListener('pointerup', handleUp);
    window.addEventListener('pointercancel', handleUp);
    return () => {
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('pointerup', handleUp);
      window.removeEventListener('pointercancel', handleUp);
    };
  }, [dragging, camera, gl, updateDrag, endDrag]);
}

function pointerToBoard(e: PointerEvent, camera: Camera, canvas: HTMLCanvasElement): Vec2 | null {
  const rect = canvas.getBoundingClientRect();
  const ndc = new Vector2(
    ((e.clientX - rect.left) / rect.width) * 2 - 1,
    -((e.clientY - rect.top) / rect.height) * 2 + 1,
  );
  const raycaster = new Raycaster();
  raycaster.setFromCamera(ndc, camera);
  const target = new Vector3();
  if (!raycaster.ray.intersectPlane(BOARD_PLANE, target)) return null;
  return { x: target.x, y: target.y };
}
