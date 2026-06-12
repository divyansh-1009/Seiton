import { useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { Box, Cone } from '@react-three/drei';

const COLORS = {
  accent: "#e1ff51",
  base: "#00272c",
};

export default function OverheadCrane({ executionMatrix, animProgress, viewMode, packMode }) {
  const bridgeRef = useRef();
  const hoistRef = useRef();
  const magnetRef = useRef();
  const cameraBeamRef = useRef();

  const targetPos = useRef(new THREE.Vector3(0, 8, 0));
  const isScanning = useRef(false);

  useEffect(() => {
    if (!executionMatrix || executionMatrix.length === 0 || viewMode === 'stress') return;
    if (packMode === 'bulk') return; // No crane animation in bulk mode

    const t = animProgress / 100;
    const N = executionMatrix.length;
    const slice = 1.0 / N;
    
    // Find the currently active move based on time t
    let activeIndex = Math.floor(t * N);
    if (activeIndex >= N) activeIndex = N - 1;
    if (activeIndex < 0) activeIndex = 0;
    
    const move = executionMatrix[activeIndex];
    if (!move || !move.target_coordinate) return;

    const src = move.source_coordinate || move.target_coordinate;
    const tgt = move.target_coordinate;
    const craneHeight = 7;

    const startT = activeIndex * slice;
    let localT = (t - startT) / slice;
    if (localT < 0) localT = 0;
    if (localT > 1) localT = 1;

    let posX, posY, posZ;

    if (localT <= 0.25) {
      const p = localT / 0.25;
      posX = src[0];
      posY = src[1] + (craneHeight - src[1]) * p;
      posZ = src[2];
    } else if (localT <= 0.75) {
      const p = (localT - 0.25) / 0.5;
      posX = src[0] + (tgt[0] - src[0]) * p;
      posY = craneHeight;
      posZ = src[2] + (tgt[2] - src[2]) * p;
    } else {
      const p = (localT - 0.75) / 0.25;
      posX = tgt[0];
      posY = craneHeight + (tgt[1] - craneHeight) * p;
      posZ = tgt[2];
    }

    targetPos.current.set(posX, posY + 1.5, posZ);

    // Scanning effect during the horizontal movement phase
    isScanning.current = t > 0.25 && t < 0.75;
  }, [executionMatrix, animProgress, viewMode, packMode]);

  useFrame((state, delta) => {
    if (viewMode === 'stress' || packMode === 'bulk') return;

    if (bridgeRef.current && hoistRef.current && magnetRef.current && cameraBeamRef.current) {
      bridgeRef.current.position.z = THREE.MathUtils.damp(bridgeRef.current.position.z, targetPos.current.z, 6, delta);
      hoistRef.current.position.x = THREE.MathUtils.damp(hoistRef.current.position.x, targetPos.current.x, 6, delta);
      const dropY = THREE.MathUtils.damp(magnetRef.current.position.y, targetPos.current.y - 7, 5, delta);
      magnetRef.current.position.y = dropY;

      if (isScanning.current) {
        cameraBeamRef.current.material.opacity = THREE.MathUtils.lerp(cameraBeamRef.current.material.opacity, 0.6, 0.1);
      } else {
        cameraBeamRef.current.material.opacity = THREE.MathUtils.lerp(cameraBeamRef.current.material.opacity, 0.0, 0.1);
      }
    }
  });

  // Hide crane entirely in bulk mode or stress view
  if (viewMode === 'stress' || packMode === 'bulk') return null;

  return (
    <group>
      {/* Rails (Static) */}
      <Box args={[0.5, 0.5, 20]} position={[-11, 8, 0]}>
        <meshStandardMaterial color={COLORS.base} />
      </Box>
      <Box args={[0.5, 0.5, 20]} position={[11, 8, 0]}>
        <meshStandardMaterial color={COLORS.base} />
      </Box>

      {/* Bridge (Moves on Z) */}
      <group ref={bridgeRef} position={[0, 8.5, 0]}>
        <Box args={[22.5, 0.6, 0.8]}>
          <meshStandardMaterial color={COLORS.accent} />
        </Box>

        {/* Hoist (Moves on X along the Bridge) */}
        <group ref={hoistRef} position={[0, -0.4, 0]}>
          <Box args={[1.5, 1.2, 1.2]}>
            <meshStandardMaterial color="#444" />
          </Box>

          {/* Cable & Magnet (Moves on Y) */}
          <group ref={magnetRef} position={[0, -2, 0]}>
            {/* The Cable (stretches up to the hoist) */}
            <Box args={[0.1, 10, 0.1]} position={[0, 5, 0]}>
              <meshStandardMaterial color="#222" />
            </Box>
            
            {/* The Magnet / End Effector */}
            <Box args={[1.2, 0.4, 1.2]}>
              <meshStandardMaterial color="#ff5555" />
            </Box>

            {/* Scanning Camera Beam */}
            <Cone ref={cameraBeamRef} args={[2, 4, 16]} position={[0, -2, 0]}>
              <meshBasicMaterial color="#00ffff" transparent opacity={0} depthWrite={false} />
            </Cone>
            {/* Glowing eye */}
            <Box args={[0.2, 0.2, 0.2]} position={[0, -0.2, 0]}>
              <meshBasicMaterial color="#00ffff" />
            </Box>
          </group>
        </group>
      </group>
    </group>
  );
}
