import { useState } from 'react';

export default function HUD({ uploadedFile, executionMatrix, animProgress, setAnimProgress, viewMode, setViewMode, packMode, stats }) {
  const [showReport, setShowReport] = useState(false);
  const totalBoxes = executionMatrix ? executionMatrix.length : 0;
  const currentStats = stats || { spaceUtilization: 85, execTime: 0.5 };
  
  // Calculate dynamic stats
  const manualTimeMins = totalBoxes * 2;
  const algTimeStr = Number(currentStats.execTime) < 0.01 ? '< 0.01s' : `${currentStats.execTime}s`;
  const manualSpacePct = 65;
  const algSpacePct = Number(currentStats.spaceUtilization).toFixed(1);
  const spaceGained = (algSpacePct - manualSpacePct).toFixed(1);

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
            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
                <div>
                    <p className="eyebrow">Digital twin</p>
                    <div style={{marginTop: '0.5rem'}}>
                      <span className="hud-chip">Mode: {packMode === 'incremental' ? 'Incremental' : 'Bulk'}</span>
                      {packMode === 'bulk' && (
                        <span className="hud-chip" style={{marginLeft: '0.5rem'}}>{totalBoxes} boxes packed</span>
                      )}
                    </div>
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
              <button 
                className="toggle-btn" 
                style={{ pointerEvents: 'auto', border: '1px solid var(--color-accent)', width: '100%', background: 'var(--color-base)' }}
                onClick={() => setShowReport(true)}
              >
                View Report
              </button>
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
                  </>
                )}
            </div>
        </div>

        {showReport && (
          <div className="report-modal-overlay" onClick={() => setShowReport(false)}>
            <div className="panel report-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 style={{textTransform: 'uppercase', marginBottom: '1.5rem'}}>Performance Report</h2>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', textAlign: 'left'}}>
                <div>
                  <p className="eyebrow" style={{marginBottom: '0.5rem', color: 'rgba(225, 255, 81, 0.7)'}}>Manual Packing</p>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, lineHeight: '2'}}>
                    <li>Estimated Time: <strong>{manualTimeMins} mins</strong></li>
                    <li>Space Utilization: <strong>~{manualSpacePct}%</strong></li>
                    <li>Cognitive Load: <strong>High</strong></li>
                    <li>Error Rate: <strong>High</strong></li>
                  </ul>
                </div>
                <div>
                  <p className="eyebrow" style={{marginBottom: '0.5rem', color: 'rgba(225, 255, 81, 0.7)'}}>Seiton Algorithm</p>
                  <ul style={{listStyle: 'none', padding: 0, margin: 0, lineHeight: '2'}}>
                    <li>Execution Time: <strong>{algTimeStr}</strong></li>
                    <li>Space Utilization: <strong>{algSpacePct}%</strong></li>
                    <li>Cognitive Load: <strong>None</strong></li>
                    <li>Error Rate: <strong>Zero</strong></li>
                  </ul>
                </div>
              </div>
              
              <div style={{marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--color-accent)'}}>
                <p className="eyebrow" style={{marginBottom: '0.5rem', color: 'rgba(225, 255, 81, 0.7)'}}>Overall Impact</p>
                <h3 style={{fontSize: '1.5rem'}}>Time Saved: {manualTimeMins} mins</h3>
                <h3 style={{fontSize: '1.5rem', marginTop: '0.5rem'}}>Space Gained: {spaceGained > 0 ? spaceGained : 0}%</h3>
              </div>

              <button className="cta" style={{width: '100%', marginTop: '2rem'}} onClick={() => setShowReport(false)}>
                Close Report
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
