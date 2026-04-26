import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';

// Owns the orthographic camera's position, lookAt target, and zoom so that a
// `worldWidth × worldHeight` extent centered on `(cx, -cy)` always fits the
// canvas. Re-runs whenever the grid dimensions change (e.g. clicking Next
// onto a differently-sized level) and whenever the canvas resizes.
//
// Use as a child of `<Canvas orthographic>`; it has no visual output.
export function FitOrthoCamera({
  worldWidth,
  worldHeight,
  cx,
  cy,
}: {
  worldWidth: number;
  worldHeight: number;
  cx: number;
  cy: number;
}) {
  const camera = useThree((s) => s.camera);
  const width = useThree((s) => s.size.width);
  const height = useThree((s) => s.size.height);

  useEffect(() => {
    // Three.js cameras are designed to be mutated; the standard R3F pattern
    // is exactly this — set fields, then call updateProjectionMatrix.
    /* eslint-disable react-hooks/immutability */
    camera.position.set(cx, -cy - 4, 11);
    camera.lookAt(cx, -cy, 0);
    if ('zoom' in camera) {
      camera.zoom = Math.min(width / worldWidth, height / worldHeight);
    }
    camera.updateProjectionMatrix();
    /* eslint-enable react-hooks/immutability */
  }, [camera, width, height, worldWidth, worldHeight, cx, cy]);

  return null;
}
