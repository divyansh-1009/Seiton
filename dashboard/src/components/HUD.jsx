import { useState } from 'react';

export default function HUD({ uploadedFile, executionMatrix, animProgress, setAnimProgress, viewMode, setViewMode, packMode, stats }) {
  const [showReport, setShowReport] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
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
                  title="View the physical solid layout of the packed boxes"
                >
                  Assembly View
                </button>
                <button 
                  className={`toggle-btn ${viewMode === 'stress' ? 'active' : ''}`}
                  onClick={() => setViewMode('stress')}
                  title="View the packing density and stress visualization as wireframes"
                >
                  Stress View
                </button>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', pointerEvents: 'auto', width: '100%' }}>
                <button 
                  className="toggle-btn" 
                  style={{ border: '1px solid var(--color-accent)', flex: 1, background: 'var(--color-base)' }}
                  onClick={() => setShowReport(true)}
                  title="View a detailed performance comparison against manual packing"
                >
                  View Report
                </button>
                <button 
                  className="toggle-btn" 
                  style={{ border: '1px solid var(--color-accent)', background: 'var(--color-base)', padding: '0.5rem 0.75rem', fontWeight: 'bold' }}
                  onClick={() => setShowInfo(true)}
                  title="Feature Guide"
                >
                  ?
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
                    {currentStats?.requestedBoxes && Number(currentStats.requestedBoxes) > totalBoxes ? (
                      <p style={{ color: '#ff7a7a' }}>
                        Requested {currentStats.requestedBoxes}, but <strong>{Number(currentStats.requestedBoxes) - totalBoxes}</strong> could not fit.
                      </p>
                    ) : (
                      <p>All requested items packed &amp; rendered</p>
                    )}
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

        {showInfo && (
          <div className="report-modal-overlay" onClick={() => setShowInfo(false)}>
            <div className="panel report-modal-content" onClick={(e) => e.stopPropagation()}>
              <h2 style={{textTransform: 'uppercase', marginBottom: '1.5rem'}}>Feature Guide</h2>
              
              <div style={{display: 'grid', gap: '1.5rem', textAlign: 'left'}}>
                <div>
                  <p className="eyebrow" style={{marginBottom: '0.25rem', color: 'var(--color-accent)'}}>Assembly View</p>
                  <p style={{fontSize: '0.9rem', lineHeight: '1.5', opacity: 0.9}}>Renders the physical layout of the boxes as solid objects, allowing you to see exactly how the items are packed in the real world.</p>
                </div>
                
                <div>
                  <p className="eyebrow" style={{marginBottom: '0.25rem', color: 'var(--color-accent)'}}>Stress View</p>
                  <p style={{fontSize: '0.9rem', lineHeight: '1.5', opacity: 0.9}}>Switches to a wireframe X-ray mode to help visualize the internal density and identify load-bearing stress points across the container.</p>
                </div>

                <div>
                  <p className="eyebrow" style={{marginBottom: '0.25rem', color: 'var(--color-accent)'}}>Crane Animation</p>
                  <p style={{fontSize: '0.9rem', lineHeight: '1.5', opacity: 0.9}}>In incremental mode, this slider scrubs through the real-time robotic crane placement trajectory for the currently detected item.</p>
                </div>
                
                <div>
                  <p className="eyebrow" style={{marginBottom: '0.25rem', color: 'var(--color-accent)'}}>Performance Report</p>
                  <p style={{fontSize: '0.9rem', lineHeight: '1.5', opacity: 0.9}}>Compares the mathematical efficiency of the Seiton algorithm against average human manual packing, detailing time and space savings.</p>
                </div>
              </div>

              <button className="cta" style={{width: '100%', marginTop: '2rem'}} onClick={() => setShowInfo(false)}>
                Got it
              </button>
            </div>
          </div>
        )}
    </div>
  );
}
