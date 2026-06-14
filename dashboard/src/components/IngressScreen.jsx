import { useState, useEffect } from 'react';

export default function IngressScreen({ onFileUpload, defaultDimensions }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);
  const [showInfo, setShowInfo] = useState(false);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type.startsWith("image/")) {
      setFile(droppedFile);
    }
  };

    const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && selectedFile.type.startsWith("image/")) {
      setFile(selectedFile);
    }
  };

  const [packMode, setPackMode] = useState('bulk');
  const [numBoxes, setNumBoxes] = useState('');
  const [containerL, setContainerL] = useState(defaultDimensions?.L || '');
  const [containerW, setContainerW] = useState(defaultDimensions?.W || '');
  const [containerH, setContainerH] = useState(defaultDimensions?.H || '');

  useEffect(() => {
    if (defaultDimensions) {
      setContainerL(defaultDimensions.L);
      setContainerW(defaultDimensions.W);
      setContainerH(defaultDimensions.H);
    }
  }, [defaultDimensions]);

  // Max theoretical boxes based on minimum 10x10x10cm random box size
  const maxPossibleBoxes = Math.max(1, 
    Math.floor((containerL || 120) / 10) * 
    Math.floor((containerW || 80) / 10) * 
    Math.floor((containerH || 100) / 10)
  );

  const handleNumBoxesChange = (e) => {
    const val = parseInt(e.target.value, 10);
    if (!isNaN(val)) {
       setNumBoxes(Math.min(val, maxPossibleBoxes));
    } else {
       setNumBoxes('');
    }
  };

  return (
    <section className="screen screen-ingress" id="screen-ingress">
        <div className="panel panel-ingress" style={{ position: 'relative' }}>
            <button 
              className="toggle-btn" 
              style={{ position: 'absolute', top: '1rem', right: '1rem', border: '1px solid var(--color-accent)', background: 'var(--color-base)', padding: '0.5rem 0.75rem', fontWeight: 'bold' }}
              onClick={() => setShowInfo(true)}
              title="Feature Guide"
            >
              ?
            </button>
            <p className="eyebrow">Logistics made autonomous</p>
            <h1>Seiton</h1>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', justifyContent: 'center' }}>
              <button 
                className={`toggle-btn ${packMode === 'bulk' ? 'active' : ''}`}
                onClick={() => { setPackMode('bulk'); setFile(null); }}
                style={{ border: '1px solid var(--color-accent)' }}
                title="Generates and packs random boxes into the container without vision input"
              >
                Bulk Mode
              </button>
              <button 
                className={`toggle-btn ${packMode === 'incremental' ? 'active' : ''}`}
                onClick={() => setPackMode('incremental')}
                style={{ border: '1px solid var(--color-accent)' }}
                title="Uses computer vision to extract items from a camera feed and pack them"
              >
                Incremental Mode
              </button>
            </div>

            {packMode === 'bulk' ? (
              <div style={{ display: 'grid', gap: '1rem', textAlign: 'left', margin: '0 auto', maxWidth: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label title="Number of random boxes to pack" style={{ cursor: 'help' }}>Number of Boxes:</label>
                  <input type="number" placeholder="20" title={`Max capacity: ${maxPossibleBoxes} boxes`} min="1" max={maxPossibleBoxes} value={numBoxes} onChange={handleNumBoxesChange} style={{ width: '60px', background: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label title="Length of the container (cm)" style={{ cursor: 'help' }}>Container Length:</label>
                  <input type="number" placeholder="120" title="Length (X-axis)" min="10" value={containerL} onChange={(e) => setContainerL(e.target.value)} style={{ width: '60px', background: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label title="Width of the container (cm)" style={{ cursor: 'help' }}>Container Width:</label>
                  <input type="number" placeholder="80" title="Width (Z-axis)" min="10" value={containerW} onChange={(e) => setContainerW(e.target.value)} style={{ width: '60px', background: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label title="Height of the container (cm)" style={{ cursor: 'help' }}>Container Height:</label>
                  <input type="number" placeholder="100" title="Height (Y-axis)" min="10" value={containerH} onChange={(e) => setContainerH(e.target.value)} style={{ width: '60px', background: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }} />
                </div>
                
                <button
                    className="cta"
                    style={{ marginTop: '1rem' }}
                    type="button"
                    title="Run the 3D packing algorithm"
                    onClick={() => onFileUpload(null, packMode, { 
                        numBoxes: numBoxes || 20, 
                        containerL: containerL || 120, 
                        containerW: containerW || 80, 
                        containerH: containerH || 100 
                    })}
                >
                    Generate Bulk Pack
                </button>
              </div>
            ) : (
              <>
                <label 
                  className={`dropzone ${isDragging ? 'is-dragging' : ''}`} 
                  id="dropzone" 
                  htmlFor="file-input"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                    <input
                        id="file-input"
                        className="visually-hidden"
                        type="file"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                    <span className="dropzone-title">Upload Cargo Image</span>
                </label>

                <div className="ingress-footer">
                    <div className="file-chip" id="file-status">
                        {file ? `${file.name} ready for ingestion` : 'No file selected'}
                    </div>
                    <button
                        className="cta"
                        id="submit-btn"
                        type="button"
                        disabled={!file}
                        onClick={() => onFileUpload(file, packMode, { containerL, containerW, containerH })}
                    >
                        Generate
                    </button>
                </div>
              </>
            )}
        </div>

        {showInfo && (
          <div className="report-modal-overlay" onClick={() => setShowInfo(false)}>
            <div className="panel report-modal-content" style={{ width: 'min(90vw, 55rem)' }} onClick={(e) => e.stopPropagation()}>
              <h2 style={{textTransform: 'uppercase', marginBottom: '1.5rem'}}>Feature Guide</h2>
              
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', textAlign: 'left'}}>
                <div>
                  <p className="eyebrow" style={{marginBottom: '0.25rem', color: 'var(--color-accent)'}}>Bulk Mode</p>
                  <p style={{fontSize: '0.9rem', lineHeight: '1.5', opacity: 0.9}}>Generates and packs a predefined number of random boxes simultaneously to simulate maximum container density scenarios without camera input.</p>
                </div>
                
                <div>
                  <p className="eyebrow" style={{marginBottom: '0.25rem', color: 'var(--color-accent)'}}>Incremental Mode</p>
                  <p style={{fontSize: '0.9rem', lineHeight: '1.5', opacity: 0.9}}>Uses computer vision to extract items from a live camera feed and mathematically calculates their optimal placement into an already partially-filled container.</p>
                </div>
                
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

                <div style={{ gridColumn: '1 / -1' }}>
                  <p className="eyebrow" style={{marginBottom: '0.25rem', color: 'var(--color-accent)'}}>Packing Limits & Empty Space</p>
                  <p style={{fontSize: '0.9rem', lineHeight: '1.5', opacity: 0.9}}>You may notice empty space if boxes are rejected. This occurs because random, rigid boxes cannot perfectly fill 100% of a container like a liquid. The algorithm successfully reaches the mathematical packing limits of irregular dimensions.</p>
                </div>
              </div>

              <button className="cta" style={{width: '100%', marginTop: '2rem'}} onClick={() => setShowInfo(false)}>
                Got it
              </button>
            </div>
          </div>
        )}
    </section>
  );
}
