import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, GizmoHelper, GizmoViewport } from '@react-three/drei';
import ContainerWireframe from './canvas/ContainerWireframe';
import InstancedBoxes from './canvas/InstancedBoxes';
import OverheadCrane from './canvas/OverheadCrane';
import PhysicsMarker from './canvas/PhysicsMarker';
import { useMemo } from 'react';
import * as THREE from 'three';

const COLORS = {
  base: "#0a1628",
};

export default function DigitalTwinCanvas({ executionMatrix, animProgress, viewMode, packMode, containerSize }) {
  // containerSize from backend = [L, H, W] in Three.js units
  const cL = containerSize[0];
  const cH = containerSize[1];
  const cW = containerSize[2];

  // Camera and orbit target = center of the container
  const center = useMemo(() => new THREE.Vector3(cL / 2, cH / 2, cW / 2), [cL, cH, cW]);

  return (
    <div style={{ position: 'fixed', inset: 0, width: '100%', height: '100%', zIndex: 1 }}>
      <Canvas 
        shadows 
        camera={{ position: [cL * 2.2, cH * 2.5, cW * 2.8], fov: 45 }}
        gl={{ antialias: true }}
      >
        <color attach="background" args={[COLORS.base]} />
        <fog attach="fog" args={[COLORS.base, 30, 80]} />

        {/* Lighting */}
        <ambientLight intensity={0.8} />
        <directionalLight 
          position={[10, 20, 10]} 
          intensity={1.2} 
          castShadow 
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        <pointLight position={[-10, 10, -10]} intensity={0.5} color="#60a5fa" />

        {/* Container + Boxes */}
        <ContainerWireframe containerSize={containerSize} />
        
        <InstancedBoxes 
          executionMatrix={executionMatrix} 
          animProgress={animProgress}
          viewMode={viewMode}
          packMode={packMode}
          containerSize={containerSize}
        />
        
        <PhysicsMarker 
          executionMatrix={executionMatrix} 
          animProgress={animProgress}
          viewMode={viewMode}
          packMode={packMode}
        />
        
        <OverheadCrane 
          executionMatrix={executionMatrix} 
          animProgress={animProgress}
          viewMode={viewMode}
          packMode={packMode}
        />

        {/* Camera Controls */}
        <OrbitControls 
          target={[center.x, center.y, center.z]}
          enableDamping
          dampingFactor={0.05}
          makeDefault
        />

        {/* Axis Gizmo moved below the View Report button */}
        <GizmoHelper alignment="top-right" margin={[60, 200]}>
          <GizmoViewport axisColors={['#ef4444', '#10b981', '#3b82f6']} labelColor="white" />
        </GizmoHelper>
      </Canvas>
    </div>
  );
}
