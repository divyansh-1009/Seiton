import { useState } from 'react';

export default function IngressScreen({ onFileUpload }) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState(null);

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
  const [numBoxes, setNumBoxes] = useState(20);
  const [containerL, setContainerL] = useState(120);
  const [containerW, setContainerW] = useState(80);
  const [containerH, setContainerH] = useState(100);

  return (
    <section className="screen screen-ingress" id="screen-ingress">
        <div className="panel panel-ingress">
            <p className="eyebrow">Logistics made autonomous</p>
            <h1>Seiton</h1>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', justifyContent: 'center' }}>
              <button 
                className={`toggle-btn ${packMode === 'bulk' ? 'active' : ''}`}
                onClick={() => { setPackMode('bulk'); setFile(null); }}
                style={{ border: '1px solid var(--color-accent)' }}
              >
                Bulk Mode
              </button>
              <button 
                className={`toggle-btn ${packMode === 'incremental' ? 'active' : ''}`}
                onClick={() => setPackMode('incremental')}
                style={{ border: '1px solid var(--color-accent)' }}
              >
                Incremental Mode
              </button>
            </div>

            {packMode === 'bulk' ? (
              <div style={{ display: 'grid', gap: '1rem', textAlign: 'left', margin: '0 auto', maxWidth: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label>Number of Boxes:</label>
                  <input type="number" min="1" max="100" value={numBoxes} onChange={(e) => setNumBoxes(e.target.value)} style={{ width: '60px', background: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label>Container Length (cm):</label>
                  <input type="number" min="10" value={containerL} onChange={(e) => setContainerL(e.target.value)} style={{ width: '60px', background: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label>Container Width (cm):</label>
                  <input type="number" min="10" value={containerW} onChange={(e) => setContainerW(e.target.value)} style={{ width: '60px', background: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }} />
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <label>Container Height (cm):</label>
                  <input type="number" min="10" value={containerH} onChange={(e) => setContainerH(e.target.value)} style={{ width: '60px', background: 'transparent', color: 'var(--color-accent)', border: '1px solid var(--color-accent)' }} />
                </div>
                
                <button
                    className="cta"
                    style={{ marginTop: '1rem' }}
                    type="button"
                    onClick={() => onFileUpload(null, packMode, { numBoxes, containerL, containerW, containerH })}
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
    </section>
  );
}
