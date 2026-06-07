export default function HUD({ uploadedFile, overallProgress, activeMoveIndex, executionMatrix }) {
  const activeMove = executionMatrix[activeMoveIndex] || executionMatrix[0];
  const progressLabel = `${Math.round(overallProgress * 100)}%`;

  const formatCoordinate = (vector) => {
    return `(${vector.map((value) => Number(value).toFixed(1)).join(", ")})`;
  };

  return (
    <div className="twin-overlay">
        <div className="hud hud-top">
            <div>
                <p className="eyebrow">Digital twin</p>
            </div>
            <div className="hud-stack">
            </div>
        </div>

        <div className="hud hud-bottom">
            <div className="hud-card">
                <p className="eyebrow">Active move</p>
                <h3 id="hud-step">
                  Move {String(activeMoveIndex + 1).padStart(2, "0")} / {String(executionMatrix.length).padStart(2, "0")}
                </h3>
                <p id="hud-source">Source {formatCoordinate(activeMove.source_coordinate)}</p>
                <p id="hud-target">Target {formatCoordinate(activeMove.target_coordinate)}</p>
            </div>

            <div className="hud-card">
                <p className="eyebrow">Execution Procedure</p>
                <div className="matrix-feed" id="matrix-feed">
                  {executionMatrix.map((move, index) => (
                    <div key={move.id} className={`matrix-row ${index === activeMoveIndex ? 'is-active' : ''}`}>
                      <strong>{move.id}</strong><br />
                      {formatCoordinate(move.source_coordinate)} → {formatCoordinate(move.target_coordinate)}
                    </div>
                  ))}
                </div>
            </div>
        </div>
    </div>
  );
}
