import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const COLORS = {
  accent: "#e1ff51",
  base: "#00272c",
};

export default function DigitalTwinCanvas({ executionMatrix, scrollStageRef, onProgressUpdate }) {
  const canvasRef = useRef(null);
  
  useEffect(() => {
    if (!canvasRef.current || !scrollStageRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(COLORS.base);

    const cameraAnchor = new THREE.Vector3(0, 2.2, 0);
    const camera = new THREE.PerspectiveCamera(
      38,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(16, 13, 16);
    camera.lookAt(cameraAnchor);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(COLORS.base);

    const root = new THREE.Group();
    scene.add(root);

    // Build Container
    const containerSize = new THREE.Vector3(10, 6, 8);
    const containerGeometry = new THREE.BoxGeometry(
      containerSize.x,
      containerSize.y,
      containerSize.z
    );
    const containerEdges = new THREE.EdgesGeometry(containerGeometry);
    const containerFrame = new THREE.LineSegments(
      containerEdges,
      new THREE.LineBasicMaterial({ color: COLORS.accent, transparent: true, opacity: 0.5 })
    );
    containerFrame.position.set(0, containerSize.y / 2, 0);
    root.add(containerFrame);

    const floorGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-5, 0, -4),
      new THREE.Vector3(5, 0, -4),
      new THREE.Vector3(5, 0, 4),
      new THREE.Vector3(-5, 0, 4),
      new THREE.Vector3(-5, 0, -4),
    ]);
    const floorOutline = new THREE.Line(
      floorGeometry,
      new THREE.LineBasicMaterial({ color: COLORS.accent })
    );
    root.add(floorOutline);

    // Build Staging Zone
    const stagingGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(-9, 0, -5.5),
      new THREE.Vector3(-5.8, 0, -5.5),
      new THREE.Vector3(-5.8, 0, 5.5),
      new THREE.Vector3(-9, 0, 5.5),
      new THREE.Vector3(-9, 0, -5.5),
    ]);
    const stagingOutline = new THREE.Line(
      stagingGeometry,
      new THREE.LineBasicMaterial({ color: COLORS.accent })
    );
    root.add(stagingOutline);

    // ---- ARTICULATED ROBOT ARM CONSTRUCTION ----
    const L1 = 8;
    const L2 = 8;
    const H = 2;
    const L3 = 1.2; // gripper length
    const BASE_X = -2;
    const BASE_Z = -8;

    const robotBase = new THREE.Group();
    robotBase.position.set(BASE_X, 0, BASE_Z);
    root.add(robotBase);

    // Base pedestal
    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.2, 1.4, H, 16),
      new THREE.MeshBasicMaterial({ color: COLORS.accent, wireframe: true })
    );
    pedestal.position.y = H / 2;
    robotBase.add(pedestal);

    // Base joint (Rotates Y)
    const baseJoint = new THREE.Group();
    baseJoint.position.set(0, H, 0);
    robotBase.add(baseJoint);

    const baseTurret = new THREE.Mesh(
      new THREE.CylinderGeometry(1, 1, 0.8, 16),
      new THREE.MeshBasicMaterial({ color: COLORS.accent })
    );
    baseTurret.position.y = 0.4;
    baseJoint.add(baseTurret);

    // Shoulder (Rotates Z)
    const shoulderGroup = new THREE.Group();
    shoulderGroup.position.set(0, 0.8, 0); // Offset above turret
    baseJoint.add(shoulderGroup);

    const upperGeo = new THREE.CylinderGeometry(0.35, 0.35, L1, 8);
    upperGeo.rotateZ(Math.PI / 2);
    upperGeo.translate(L1 / 2, 0, 0);
    const upperArm = new THREE.Mesh(
      upperGeo,
      new THREE.MeshBasicMaterial({ color: COLORS.accent, wireframe: true })
    );
    shoulderGroup.add(upperArm);

    // Elbow (Rotates Z)
    const elbowGroup = new THREE.Group();
    elbowGroup.position.set(L1, 0, 0);
    shoulderGroup.add(elbowGroup);

    const elbowJointMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.5, 0.5, 1, 16),
      new THREE.MeshBasicMaterial({ color: COLORS.accent })
    );
    elbowJointMesh.rotation.x = Math.PI / 2;
    elbowGroup.add(elbowJointMesh);

    const foreGeo = new THREE.CylinderGeometry(0.25, 0.25, L2, 8);
    foreGeo.rotateZ(Math.PI / 2);
    foreGeo.translate(L2 / 2, 0, 0);
    const foreArm = new THREE.Mesh(
      foreGeo,
      new THREE.MeshBasicMaterial({ color: COLORS.accent, wireframe: true })
    );
    elbowGroup.add(foreArm);

    // Wrist (Rotates Z to keep gripper down)
    const wristGroup = new THREE.Group();
    wristGroup.position.set(L2, 0, 0);
    elbowGroup.add(wristGroup);

    const wristJointMesh = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.4, 0.8, 16),
      new THREE.MeshBasicMaterial({ color: COLORS.accent })
    );
    wristJointMesh.rotation.x = Math.PI / 2;
    wristGroup.add(wristJointMesh);

    // Gripper (extends along X by L3, pointing DOWN via wrist rotation)
    const gripperGroup = new THREE.Group();
    wristGroup.add(gripperGroup);

    const gripperBaseGeo = new THREE.BoxGeometry(0.2, 1.6, 1.6);
    gripperBaseGeo.translate(0.1, 0, 0);
    const gripperBaseMesh = new THREE.Mesh(
      gripperBaseGeo,
      new THREE.MeshBasicMaterial({ color: COLORS.accent })
    );
    gripperGroup.add(gripperBaseMesh);

    const fingerGeo = new THREE.BoxGeometry(L3 - 0.2, 0.1, 1.6);
    fingerGeo.translate(0.2 + (L3 - 0.2)/2, 0, 0);
    const fingerMat = new THREE.MeshBasicMaterial({ color: COLORS.accent, wireframe: true });
    
    const leftFinger = new THREE.Mesh(fingerGeo, fingerMat);
    leftFinger.position.set(0, -0.75, 0);
    gripperGroup.add(leftFinger);

    const rightFinger = new THREE.Mesh(fingerGeo, fingerMat);
    rightFinger.position.set(0, 0.75, 0);
    gripperGroup.add(rightFinger);

    // -----------------------------------

    // Build Motion Meshes
    const motionData = executionMatrix.map((move, index) => {
      const size = new THREE.Vector3(...move.size);
      const source = new THREE.Vector3(...move.source_coordinate);
      const target = new THREE.Vector3(...move.target_coordinate);

      const boxGeo = new THREE.BoxGeometry(size.x, size.y, size.z);
      
      // Main solid box
      const mesh = new THREE.Mesh(
        boxGeo,
        new THREE.MeshBasicMaterial({ color: COLORS.accent })
      );
      
      // Sharp boundary line to distinguish overlapping boxes
      const edges = new THREE.EdgesGeometry(boxGeo);
      const edgesLine = new THREE.LineSegments(
        edges,
        new THREE.LineBasicMaterial({ color: COLORS.base, linewidth: 2 })
      );
      mesh.add(edgesLine);

      mesh.position.copy(source);
      mesh.rotation.y = index * 0.08;
      root.add(mesh);

      const targetGhost = new THREE.LineSegments(
        new THREE.EdgesGeometry(boxGeo),
        new THREE.LineBasicMaterial({
          color: COLORS.accent,
          transparent: true,
          opacity: 0.35,
        })
      );
      targetGhost.position.copy(target);
      root.add(targetGhost);

      return {
        ...move,
        size,
        source,
        target,
        liftHeight: 8.5,
        mesh,
        targetGhost,
        progressState: { value: 0 },
      };
    });

    // Inverse Kinematics Solver Function
    const solveIK = (targetPos, targetRotationY) => {
      const W_x = targetPos.x;
      const W_z = targetPos.z;
      const W_y = targetPos.y + L3; // Wrist needs to be L3 units above target

      const dx = W_x - BASE_X;
      const dz = W_z - BASE_Z;
      const r = Math.sqrt(dx * dx + dz * dz);
      const dy = W_y - (H + 0.8); // 0.8 is the offset of shoulder above turret

      // 1. Base Pan
      baseJoint.rotation.y = Math.atan2(-dz, dx);

      // 2. 2D Planar IK for Shoulder and Elbow
      let D = Math.sqrt(r * r + dy * dy);
      D = Math.min(D, L1 + L2 - 0.001); // Prevent unreachable NaN

      const beta = Math.atan2(dy, r);
      const gamma = Math.acos((L1 * L1 + D * D - L2 * L2) / (2 * L1 * D));
      const theta2 = beta + gamma;
      
      const alpha = Math.acos((L1 * L1 + L2 * L2 - D * D) / (2 * L1 * L2));
      const theta3 = -(Math.PI - alpha);

      shoulderGroup.rotation.z = theta2;
      elbowGroup.rotation.z = theta3;

      // 3. Wrist pointing straight down
      wristGroup.rotation.z = -Math.PI / 2 - theta2 - theta3;

      // 4. Align Gripper fingers to the box
      gripperGroup.rotation.x = baseJoint.rotation.y - targetRotationY;
    };

    // Scroll Sequence
    const totalMoves = motionData.length;
    const scrollTimeline = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: scrollStageRef.current,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const moveIndex = Math.min(
            totalMoves - 1,
            Math.floor(self.progress * totalMoves)
          );
          onProgressUpdate(moveIndex, self.progress);
        },
      },
    });

    motionData.forEach((move, index) => {
      scrollTimeline.to(
        move.progressState,
        {
          value: 1,
          duration: 1,
          onUpdate: () => {
            const progress = move.progressState.value;
            const sourceLift = new THREE.Vector3(move.source.x, move.liftHeight, move.source.z);
            const targetLift = new THREE.Vector3(move.target.x, move.liftHeight, move.target.z);
            const nextPosition = new THREE.Vector3();

            if (progress <= 1 / 3) {
              nextPosition.lerpVectors(move.source, sourceLift, progress * 3);
            } else if (progress <= 2 / 3) {
              nextPosition.lerpVectors(sourceLift, targetLift, (progress - 1 / 3) * 3);
            } else {
              nextPosition.lerpVectors(targetLift, move.target, (progress - 2 / 3) * 3);
            }

            move.mesh.position.copy(nextPosition);
            move.mesh.rotation.y = progress * Math.PI * 0.35;
            move.targetGhost.material.opacity = progress > 0.98 ? 0.12 : 0.35;

            // Compute exact gripping point on the box
            const boxTopY = nextPosition.y + (move.size.y / 2);
            const targetPos = new THREE.Vector3(nextPosition.x, boxTopY, nextPosition.z);
            
            // Execute IK
            solveIK(targetPos, move.mesh.rotation.y);
          },
        },
        index
      );

      scrollTimeline.to(
        camera.position,
        {
          x: 16 - index * 0.55,
          y: 13 - index * 0.15,
          z: 16 - index * 0.45,
          duration: 1,
          onUpdate: () => {
            camera.lookAt(cameraAnchor);
          },
        },
        index
      );
    });

    // Handle initial state setup
    if (motionData.length > 0) {
        const firstMove = motionData[0];
        const boxTopY = firstMove.source.y + (firstMove.size.y / 2);
        const targetPos = new THREE.Vector3(firstMove.source.x, boxTopY, firstMove.source.z);
        solveIK(targetPos, firstMove.mesh.rotation.y);
    }

    // Handle Resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };
    window.addEventListener('resize', handleResize);

    // Animation Loop
    renderer.setAnimationLoop(() => {
      camera.lookAt(cameraAnchor);
      renderer.render(scene, camera);
    });

    ScrollTrigger.refresh();

    return () => {
      window.removeEventListener('resize', handleResize);
      renderer.setAnimationLoop(null);
      renderer.dispose();
      scrollTimeline.kill();
      ScrollTrigger.getAll().forEach(t => t.kill());
      scene.clear();
    };
  }, [executionMatrix, scrollStageRef, onProgressUpdate]);

  return <canvas id="twin-canvas" ref={canvasRef}></canvas>;
}
