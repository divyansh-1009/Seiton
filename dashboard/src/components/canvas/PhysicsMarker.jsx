import { useMemo } from 'react';
import { Sphere } from '@react-three/drei';

export default function PhysicsMarker({ executionMatrix, animProgress, viewMode, packMode }) {
  const cogPosition = useMemo(() => {
    if (!executionMatrix || executionMatrix.length === 0) return null;

    let totalMass = 0;
    let sumX = 0;
    let sumY = 0;
    let sumZ = 0;

    for (let i = 0; i < executionMatrix.length; i++) {
      const move = executionMatrix[i];
      if (!move.size || !move.target_coordinate) continue;

      // In incremental mode, only include pre-filled boxes and the active box at its current animated position
      // In bulk mode, include everything at final positions
      const [sx, sy, sz] = move.size;
      const mass = sx * sy * sz;
      
      const [tx, ty, tz] = move.target_coordinate;
      sumX += mass * tx;
      sumY += mass * ty;
      sumZ += mass * tz;
      totalMass += mass;
    }

    if (totalMass === 0) return null;

    return [sumX / totalMass, sumY / totalMass, sumZ / totalMass];
  }, [executionMatrix, animProgress, viewMode, packMode]);

  if (!cogPosition) return null;

  return (
    <group position={cogPosition}>
      {/* Outer Glow */}
      <Sphere args={[0.6, 16, 16]}>
        <meshBasicMaterial color="#ff3333" transparent opacity={0.3} />
      </Sphere>
      {/* Solid Core */}
      <Sphere args={[0.2, 16, 16]}>
        <meshBasicMaterial color="#ff0000" />
      </Sphere>
    </group>
  );
}
