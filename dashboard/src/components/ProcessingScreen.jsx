import { useEffect, useRef } from 'react';
import gsap from 'gsap';

export default function ProcessingScreen() {
  const outerRef = useRef(null);
  const middleRef = useRef(null);
  const coreRef = useRef(null);
  const stepsRef = useRef([]);

  useEffect(() => {
    const timeline = gsap.timeline({
      repeat: -1,
      defaults: { ease: "none" },
    });

    timeline
      .to(outerRef.current, { rotation: 360, duration: 4, transformOrigin: "50% 50%" }, 0)
      .to(middleRef.current, { rotation: -360, duration: 2.5, transformOrigin: "50% 50%" }, 0)
      .to(coreRef.current, {
        scale: 0.45,
        duration: 1,
        yoyo: true,
        repeat: 1,
        transformOrigin: "50% 50%",
      }, 0);

    gsap.to(stepsRef.current, {
      backgroundColor: "#e1ff51",
      color: "#00272c",
      duration: 0.8,
      stagger: 0.2,
      repeat: -1,
      yoyo: true,
      ease: "power1.inOut",
    });

    return () => {
      timeline.kill();
      gsap.killTweensOf([outerRef.current, middleRef.current, coreRef.current, ...stepsRef.current]);
    };
  }, []);

  return (
    <section className="screen screen-processing" id="screen-processing">
        <div className="panel panel-processing">
            <div className="processing-loader" aria-hidden="true">
                <span ref={outerRef} className="loader-ring loader-ring--outer"></span>
                <span ref={middleRef} className="loader-ring loader-ring--middle"></span>
                <span ref={coreRef} className="loader-core"></span>
            </div>

            <p className="eyebrow">Execution pipeline</p>
            <h2>Processing...</h2>

            <div className="processing-steps">
            </div>
        </div>
    </section>
  );
}
