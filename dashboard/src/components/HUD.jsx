export default function HUD({ uploadedFile, executionMatrix, animProgress, setAnimProgress, viewMode, setViewMode, packMode }) {
  const totalBoxes = executionMatrix ? executionMatrix.length : 0;

  const formatCoordinate = (vector) => {
    if (!vector) return "N/A";
    return `(${vector.map((value) => Number(value).toFixed(1)).join(", ")})`;
  };

  // For incremental mode, find the active (non-prefilled) move
  const activeMove = packMode === 'incremental' && executionMatrix
    ? executionMatrix.find(m => m.step === 1)
    : null;

  return (
    <div className="twin-overlay">
        <div className="hud hud-top">
            <div>
                <p className="eyebrow">Digital twin</p>
                <div style={{marginTop: '0.5rem'}}>
                  <span className="hud-chip">Mode: {packMode === 'incremental' ? 'Incremental' : 'Bulk'}</span>
                  {packMode === 'bulk' && (
                    <span className="hud-chip" style={{marginLeft: '0.5rem'}}>{totalBoxes} boxes packed</span>
                  )}
                </div>
            </div>
            <div className="hud-stack">
              <div className="toggle-container">
                <button 
                  className={`toggle-btn ${viewMode === 'assembly' ? 'active' : ''}`}
                  onClick={() => setViewMode('assembly')}
                >
                  Assembly View
                </button>
                <button 
                  className={`toggle-btn ${viewMode === 'stress' ? 'active' : ''}`}
                  onClick={() => setViewMode('stress')}
                >
                  Stress View
                </button>
              </div>
            </div>
        </div>

        <div className="hud hud-bottom">
            {packMode === 'incremental' && (
              <div className="hud-card timeline-card">
                  <p className="eyebrow">Crane Animation</p>
                  <div className="slider-container">
                    <input 
                      type="range" 
                      min="0" 
                      max="100" 
                      value={animProgress} 
                      onChange={(e) => setAnimProgress(parseInt(e.target.value, 10))}
                      className="timeline-slider"
                    />
                    <div className="slider-labels">
                      <span>Pickup</span>
                      <span>Placed</span>
                    </div>
                  </div>
              </div>
            )}

            <div className="hud-card info-card">
                <p className="eyebrow">{packMode === 'bulk' ? 'Packing Result' : 'Active Placement'}</p>
                {packMode === 'bulk' ? (
                  <>
                    <h3>{totalBoxes} boxes</h3>
                    <p>All items packed &amp; rendered</p>
                  </>
                ) : (
                  <>
                    <h3 id="hud-step">
                      Progress: {animProgress}%
                    </h3>
                    <p id="hud-source">Source: {activeMove ? formatCoordinate(activeMove.source_coordinate) : "N/A"}</p>
                    <p id="hud-target">Target: {activeMove ? formatCoordinate(activeMove.target_coordinate) : "N/A"}</p>
                  </>
                )}
            </div>
        </div>
    </div>
  );
}
