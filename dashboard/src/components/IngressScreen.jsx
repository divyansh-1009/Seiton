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

  return (
    <section className="screen screen-ingress" id="screen-ingress">
        <div className="panel panel-ingress">
            <p className="eyebrow">Logistics made autonomous</p>
            <h1>Seiton</h1>

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
                    onClick={() => onFileUpload(file)}
                >
                    Generate
                </button>
            </div>
        </div>
    </section>
  );
}
