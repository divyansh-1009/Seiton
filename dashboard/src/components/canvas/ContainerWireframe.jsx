import { useMemo } from 'react';
import { Grid, Edges } from '@react-three/drei';
import * as THREE from 'three';

export default function ContainerWireframe({ containerSize }) {
  // containerSize = [L, H, W] in Three.js units
  const cL = containerSize[0];
  const cH = containerSize[1];
  const cW = containerSize[2];

  return (
    <>
      {/* Floor Grid (infinite, fading) */}
      <Grid
        infiniteGrid
        fadeDistance={50}
        fadeStrength={5}
        sectionColor="#475569"
        cellColor="#1e293b"
        sectionThickness={1.5}
      />

      {/* Container Bounds - positioned at center like reference repo */}
      <group position={[cL / 2, cH / 2, cW / 2]}>
        <mesh>
          <boxGeometry args={[cL, cH, cW]} />
          <meshStandardMaterial 
            color="#0f172a" 
            transparent 
            opacity={0.05} 
            side={THREE.DoubleSide}
          />
          <Edges scale={1} color="#475569" />
        </mesh>
      </group>
    </>
  );
}
