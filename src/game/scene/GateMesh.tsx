import { useEffect, useMemo } from 'react';
import { ExtrudeGeometry, Shape } from 'three';
import { RoundedBox } from '@react-three/drei';

import type { Gate } from '../engine/types';
import { blockPalette } from './palette';

// The gate is built as three stacked layers:
//   1. A chunky body that sits flush with the board's frame — embedded a
//      hair into the frame's depth and protruding outward.
//   2. A brighter sill on top, slightly inset, in the highlight tone.
//   3. A flat triangular arrow chevron painted on the sill, pointing in the
//      block's exit direction.

const FRAME_PADDING = 0.28;          // matches BoardMesh's frame extension
const GATE_DEPTH_OUT = 0.2;          // how far past the frame the gate sticks
const GATE_RISE = 0.18;              // gate top above board surface (z)
const GATE_EMBED_Z = 0.05;           // gate bottom recessed into frame (z)
const GATE_LATERAL_INSET = 0.08;     // small gap from the cells either side

const SILL_INSET = 0.08;
const SILL_HEIGHT = 0.04;

const ARROW_HALF_BASE = 0.12;
const ARROW_HEIGHT = 0.18;
const ARROW_DEPTH = 0.05;

export function GateMesh({
  gate,
  gridWidth,
  gridHeight,
}: {
  gate: Gate;
  gridWidth: number;
  gridHeight: number;
}) {
  const palette = blockPalette[gate.color];
  const span = gate.width - GATE_LATERAL_INSET * 2;
  const slabDepth = FRAME_PADDING + GATE_DEPTH_OUT;
  const config = layout(gate, gridWidth, gridHeight, span, slabDepth);

  return (
    <group>
      <RoundedBox
        args={config.bodySize}
        radius={0.05}
        smoothness={2}
        position={config.bodyCenter}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial color={palette.base} roughness={0.55} metalness={0.05} />
      </RoundedBox>

      <mesh position={config.sillCenter} castShadow>
        <boxGeometry args={config.sillSize} />
        <meshStandardMaterial
          color={palette.highlight}
          roughness={0.4}
          metalness={0.1}
          emissive={palette.highlight}
          emissiveIntensity={0.18}
        />
      </mesh>

      <ArrowChevron
        position={config.arrowCenter}
        rotation={config.arrowRotation}
        color={palette.highlight}
      />
    </group>
  );
}

type Layout = {
  bodyCenter: [number, number, number];
  bodySize: [number, number, number];
  sillCenter: [number, number, number];
  sillSize: [number, number, number];
  arrowCenter: [number, number, number];
  arrowRotation: [number, number, number];
};

function layout(
  gate: Gate,
  gridWidth: number,
  gridHeight: number,
  span: number,
  slabDepth: number,
): Layout {
  const bodyZ = (GATE_RISE - GATE_EMBED_Z) / 2;
  const bodyH = GATE_RISE + GATE_EMBED_Z;
  const sillZ = GATE_RISE + SILL_HEIGHT / 2;
  const sillTopZ = GATE_RISE + SILL_HEIGHT;
  // Pull the arrow toward the outer edge of the sill so it reads as
  // pointing past the gate.
  const arrowOffsetFromCenter = slabDepth / 2 - ARROW_HEIGHT / 2 - SILL_INSET;

  switch (gate.side) {
    case 'top': {
      const cx = gate.position + gate.width / 2;
      const cy = slabDepth / 2;
      return {
        bodyCenter: [cx, cy, bodyZ],
        bodySize: [span, slabDepth, bodyH],
        sillCenter: [cx, cy, sillZ],
        sillSize: [span - SILL_INSET * 2, slabDepth - SILL_INSET * 2, SILL_HEIGHT],
        arrowCenter: [cx, cy + arrowOffsetFromCenter, sillTopZ],
        arrowRotation: [0, 0, 0],
      };
    }
    case 'bottom': {
      const cx = gate.position + gate.width / 2;
      const cy = -gridHeight - slabDepth / 2;
      return {
        bodyCenter: [cx, cy, bodyZ],
        bodySize: [span, slabDepth, bodyH],
        sillCenter: [cx, cy, sillZ],
        sillSize: [span - SILL_INSET * 2, slabDepth - SILL_INSET * 2, SILL_HEIGHT],
        arrowCenter: [cx, cy - arrowOffsetFromCenter, sillTopZ],
        arrowRotation: [0, 0, Math.PI],
      };
    }
    case 'left': {
      const cx = -slabDepth / 2;
      const cy = -(gate.position + gate.width / 2);
      return {
        bodyCenter: [cx, cy, bodyZ],
        bodySize: [slabDepth, span, bodyH],
        sillCenter: [cx, cy, sillZ],
        sillSize: [slabDepth - SILL_INSET * 2, span - SILL_INSET * 2, SILL_HEIGHT],
        arrowCenter: [cx - arrowOffsetFromCenter, cy, sillTopZ],
        arrowRotation: [0, 0, Math.PI / 2],
      };
    }
    case 'right': {
      const cx = gridWidth + slabDepth / 2;
      const cy = -(gate.position + gate.width / 2);
      return {
        bodyCenter: [cx, cy, bodyZ],
        bodySize: [slabDepth, span, bodyH],
        sillCenter: [cx, cy, sillZ],
        sillSize: [slabDepth - SILL_INSET * 2, span - SILL_INSET * 2, SILL_HEIGHT],
        arrowCenter: [cx + arrowOffsetFromCenter, cy, sillTopZ],
        arrowRotation: [0, 0, -Math.PI / 2],
      };
    }
  }
}

function ArrowChevron({
  position,
  rotation,
  color,
}: {
  position: [number, number, number];
  rotation: [number, number, number];
  color: string;
}) {
  const geometry = useMemo(() => {
    const shape = new Shape();
    shape.moveTo(0, ARROW_HEIGHT / 2);          // tip (+Y in shape's local frame)
    shape.lineTo(-ARROW_HALF_BASE, -ARROW_HEIGHT / 2);
    shape.lineTo(ARROW_HALF_BASE, -ARROW_HEIGHT / 2);
    shape.closePath();
    return new ExtrudeGeometry(shape, {
      depth: ARROW_DEPTH,
      bevelEnabled: false,
    });
  }, []);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return (
    <mesh geometry={geometry} position={position} rotation={rotation} castShadow>
      <meshStandardMaterial color={color} roughness={0.4} metalness={0.1} />
    </mesh>
  );
}
