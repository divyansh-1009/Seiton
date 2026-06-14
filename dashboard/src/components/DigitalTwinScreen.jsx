import { useState, useEffect } from 'react';
import gsap from 'gsap';
import HUD from './HUD';
import DigitalTwinCanvas from './DigitalTwinCanvas';

export default function DigitalTwinScreen({ uploadedFile, executionMatrix, packMode, containerSize, stats }) {
  const [animProgress, setAnimProgress] = useState(0);
  const [viewMode, setViewMode] = useState('assembly');

  useEffect(() => {
    document.body.classList.add("digital-twin-active");
    return () => {
      document.body.classList.remove("digital-twin-active");
    };
  }, []);

  useEffect(() => {
    gsap.fromTo(
      ".hud",
      { y: 32, opacity: 0 },
      { y: 0, opacity: 1, duration: 0.9, stagger: 0.08, ease: "power2.out" }
    );

    if (packMode === 'bulk') {
      setAnimProgress(0);
      gsap.to({ value: 0 }, {
        value: 100,
        duration: 4.5,
        ease: "power1.inOut",
        onUpdate: function() {
          setAnimProgress(this.targets()[0].value);
        }
      });
    } else if (packMode === 'incremental') {
      setAnimProgress(0); // Let the user manually control the slider
    }
  }, [packMode, executionMatrix]);

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
        stats={stats}
      />
    </section>
  );
}
