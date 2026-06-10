import { useState, useEffect } from 'react';
import gsap from 'gsap';
import HUD from './HUD';
import DigitalTwinCanvas from './DigitalTwinCanvas';

export default function DigitalTwinScreen({ uploadedFile, executionMatrix, packMode, containerSize }) {
  const [animProgress, setAnimProgress] = useState(0);
  const [viewMode, setViewMode] = useState('assembly');

  useEffect(() => {
    gsap.fromTo(
      ".hud",
      { y: 32, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: "power2.out" }
    );
  }, [packMode]);

  return (
    <section className="screen screen-twin" id="screen-twin">
      <DigitalTwinCanvas 
        executionMatrix={executionMatrix} 
        animProgress={animProgress}
        viewMode={viewMode}
        packMode={packMode}
        containerSize={containerSize}
      />
      <HUD 
        uploadedFile={uploadedFile} 
        executionMatrix={executionMatrix}
        animProgress={animProgress}
        setAnimProgress={setAnimProgress}
        viewMode={viewMode}
        setViewMode={setViewMode}
        packMode={packMode}
      />
    </section>
  );
}
