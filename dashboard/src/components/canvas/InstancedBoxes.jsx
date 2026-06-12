import { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

const COLORS = {
  accent: new THREE.Color("#e1ff51"),
  prefill: new THREE.Color("#66aacc"),
  active: new THREE.Color("#ff6622"),
};

const PALETTE = [
  new THREE.Color("#e63226"), // Red
  new THREE.Color("#2ecc40"), // Green
  new THREE.Color("#0074e8"), // Blue
  new THREE.Color("#ffdd00"), // Yellow
  new THREE.Color("#8e44ad"), // Purple
  new THREE.Color("#ff8c00"), // Orange
  new THREE.Color("#00bcd4"), // Cyan
  new THREE.Color("#e91e63"), // Pink
];

export default function InstancedBoxes({ executionMatrix, animProgress, viewMode, packMode, containerSize }) {
  const meshRef = useRef();
  const edgesRef = useRef();

  const boxGeometry = useMemo(() => new THREE.BoxGeometry(1, 1, 1), []);

  const totalInstances = executionMatrix ? executionMatrix.length : 0;

  // Stress map
  const stresses = useMemo(() => {
    if (!executionMatrix || executionMatrix.length === 0) return [];
    let maxStress = 0.001;
    const computed = executionMatrix.map((box, i) => {
      let stress = 0;
      for (let j = 0; j < executionMatrix.length; j++) {
        const other = executionMatrix[j];
        if (i !== j && other.target_coordinate && box.target_coordinate) {
          if (other.target_coordinate[1] > box.target_coordinate[1]) {
            const dx = Math.abs(other.target_coordinate[0] - box.target_coordinate[0]);
            const dz = Math.abs(other.target_coordinate[2] - box.target_coordinate[2]);
            if (dx < (box.size[0] + other.size[0]) / 2 && dz < (box.size[2] + other.size[2]) / 2) {
              stress += other.size[0] * other.size[1] * other.size[2];
            }
          }
        }
      }
      if (stress > maxStress) maxStress = stress;
      return stress;
    });
    return computed.map(s => s / maxStress);
  }, [executionMatrix]);

  useEffect(() => {
    if (!meshRef.current || !edgesRef.current || totalInstances === 0) return;

    meshRef.current.count = totalInstances;
    edgesRef.current.count = totalInstances;

    const tempMatrix = new THREE.Matrix4();
    const tempColor = new THREE.Color();
    const t = animProgress / 100;

    for (let i = 0; i < totalInstances; i++) {
      const move = executionMatrix[i];
      if (!move.size || !move.target_coordinate) continue;

      const [sizeX, sizeY, sizeZ] = move.size;
      // Backend sends corner-based coords. We add half-size to center the mesh.
      let cornerX, cornerY, cornerZ;

      let boxScale = new THREE.Vector3(sizeX, sizeY, sizeZ);

      if (packMode === 'incremental') {
        const N = totalInstances;
        const slice = 1.0 / N;
        const startT = i * slice;
        const endT = (i + 1) * slice;
        
        let localT = 0;
        if (t <= startT) {
           localT = 0; // Not picked up yet
        } else if (t >= endT) {
           localT = 1; // Already placed
        } else {
           localT = (t - startT) / slice; // 0 to 1 during its slice
        }
        
        const src = move.source_coordinate || move.target_coordinate;
        const tgt = move.target_coordinate;
        const craneHeight = (containerSize ? containerSize[1] : 10) + 2; 

        if (localT === 0) {
           cornerX = src[0];
           cornerY = src[1];
           cornerZ = src[2];
           boxScale.set(0, 0, 0); // Hide before picked up
        } else if (localT === 1) {
           cornerX = tgt[0];
           cornerY = tgt[1];
           cornerZ = tgt[2];
        } else {
            // Animate along crane path using localT
            if (localT <= 0.25) {
              const p = localT / 0.25;
              cornerX = src[0];
              cornerY = src[1] + (craneHeight - src[1]) * p;
              cornerZ = src[2];
            } else if (localT <= 0.75) {
              const p = (localT - 0.25) / 0.5;
              cornerX = src[0] + (tgt[0] - src[0]) * p;
              cornerY = craneHeight;
              cornerZ = src[2] + (tgt[2] - src[2]) * p;
            } else {
              const p = (localT - 0.75) / 0.25;
              cornerX = tgt[0];
              cornerY = craneHeight + (tgt[1] - craneHeight) * p;
              cornerZ = tgt[2];
            }
        }
      } else if (packMode === 'bulk') {
        const stagger = 0.8 / Math.max(1, totalInstances - 1);
        const startT = i * stagger;
        const endT = startT + 0.2;
        
        let p = 0;
        if (t <= startT) p = 0;
        else if (t >= endT) p = 1;
        else {
          p = (t - startT) / (endT - startT);
          // Ease out bounce or ease out quad
          p = 1 - Math.pow(1 - p, 3);
        }

        const tgt = move.target_coordinate;
        const dropHeight = (containerSize ? containerSize[1] : 10) + 5;

        if (p === 0) {
          cornerX = tgt[0];
          cornerY = dropHeight;
          cornerZ = tgt[2];
          boxScale.set(0, 0, 0); // Hide before dropping
        } else {
          cornerX = tgt[0];
          cornerY = dropHeight - (dropHeight - tgt[1]) * p;
          cornerZ = tgt[2];
        }
      } else {
        // Place at final target position
        cornerX = move.target_coordinate[0];
        cornerY = move.target_coordinate[1];
        cornerZ = move.target_coordinate[2];
      }

      // Reference repo positioning: position = corner + half-size (center of box)
      tempMatrix.compose(
        new THREE.Vector3(cornerX + sizeX / 2, cornerY + sizeY / 2, cornerZ + sizeZ / 2),
        new THREE.Quaternion(),
        boxScale
      );

      meshRef.current.setMatrixAt(i, tempMatrix);
      edgesRef.current.setMatrixAt(i, tempMatrix);

      // Coloring
      if (viewMode === 'stress') {
        const stressRatio = stresses[i] || 0;
        tempColor.setHSL((1 - stressRatio) * 0.3, 1.0, 0.5);
      } else if (packMode === 'incremental') {
         const N = totalInstances;
         const slice = 1.0 / N;
         const startT = i * slice;
         const endT = (i + 1) * slice;
         if (t >= startT && t <= endT && t < 1.0) {
             tempColor.copy(COLORS.active);
         } else {
             tempColor.copy(PALETTE[i % PALETTE.length]);
         }
      } else {
        tempColor.copy(PALETTE[i % PALETTE.length]);
      }
      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    edgesRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [executionMatrix, animProgress, viewMode, stresses, totalInstances, packMode, containerSize]);

  if (totalInstances === 0) return null;

  return (
    <group>
      {/* Solid colored boxes */}
      <instancedMesh
        ref={meshRef}
        args={[boxGeometry, undefined, totalInstances]}
        castShadow
        receiveShadow
      >
        <meshStandardMaterial roughness={0.3} metalness={0.2} />
      </instancedMesh>

      {/* Wireframe overlay (same matrix, white wireframe) */}
      <instancedMesh
        ref={edgesRef}
        args={[boxGeometry, undefined, totalInstances]}
      >
        <meshBasicMaterial color="white" wireframe transparent opacity={0.3} depthWrite={false} />
      </instancedMesh>
    </group>
  );
}
