import { useState, useRef, useEffect } from 'react';
import gsap from 'gsap';
import HUD from './HUD';
import ScrollStage from './ScrollStage';
import DigitalTwinCanvas from './DigitalTwinCanvas';

export default function DigitalTwinScreen({ uploadedFile, executionMatrix }) {
  const scrollStageRef = useRef(null);
  const [activeMoveIndex, setActiveMoveIndex] = useState(0);
  const [overallProgress, setOverallProgress] = useState(0);

  const handleProgressUpdate = (index, progress) => {
    setActiveMoveIndex(index);
    setOverallProgress(progress);
  };

  useEffect(() => {
    gsap.fromTo(
      ".hud, .scroll-panel",
      { y: 32, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: "power2.out" }
    );
  }, []);

  return (
    <section className="screen screen-twin" id="screen-twin">
      <DigitalTwinCanvas 
        executionMatrix={executionMatrix} 
        scrollStageRef={scrollStageRef} 
        onProgressUpdate={handleProgressUpdate} 
      />
      <HUD 
        uploadedFile={uploadedFile} 
        overallProgress={overallProgress}
        activeMoveIndex={activeMoveIndex}
        executionMatrix={executionMatrix}
      />
      <ScrollStage ref={scrollStageRef} />
    </section>
  );
}
