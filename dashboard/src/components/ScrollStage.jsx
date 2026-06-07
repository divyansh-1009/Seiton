import { forwardRef } from 'react';

const ScrollStage = forwardRef((props, ref) => {
  return (
    <div className="scroll-stage" id="scroll-stage" ref={ref}>
        <article className="scroll-panel"></article>
        <article className="scroll-panel scroll-panel-center"></article>
        <article className="scroll-panel scroll-panel-end"></article>
    </div>
  );
});

export default ScrollStage;
