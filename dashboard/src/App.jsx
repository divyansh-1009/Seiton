import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import IngressScreen from './components/IngressScreen';
import ProcessingScreen from './components/ProcessingScreen';
import DigitalTwinScreen from './components/DigitalTwinScreen';
import './index.css';

function App() {
  const navigate = useNavigate();
  const [uploadedFile, setUploadedFile] = useState(null);
  const [executionMatrix, setExecutionMatrix] = useState(() => {
    const saved = localStorage.getItem('seiton_matrix');
    return saved ? JSON.parse(saved) : [];
  });
  const [containerSize, setContainerSize] = useState(() => {
    const saved = localStorage.getItem('seiton_container');
    return saved ? JSON.parse(saved) : [12, 10, 8];
  });

  const [packMode, setPackMode] = useState(() => {
    const saved = localStorage.getItem('seiton_packMode');
    return saved ? saved : 'bulk';
  });

  useEffect(() => {
    localStorage.setItem('seiton_matrix', JSON.stringify(executionMatrix));
  }, [executionMatrix]);

  useEffect(() => {
    localStorage.setItem('seiton_container', JSON.stringify(containerSize));
  }, [containerSize]);

  useEffect(() => {
    localStorage.setItem('seiton_packMode', packMode);
  }, [packMode]);

  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('seiton_stats');
    return saved ? JSON.parse(saved) : { spaceUtilization: 85, execTime: 0.5 };
  });

  useEffect(() => {
    localStorage.setItem('seiton_stats', JSON.stringify(stats));
  }, [stats]);

  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileUpload = async (file, mode, config = {}) => {
    setUploadedFile(file);
    setPackMode(mode);
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      if (file) {
        formData.append('image', file);
      }
      formData.append('max_l_cm', config.containerL || '120');
      formData.append('max_w_cm', config.containerW || '80');
      formData.append('max_h_cm', config.containerH || '100');
      formData.append('pack_mode', mode);
      if (mode === 'bulk') {
        formData.append('num_boxes', config.numBoxes || '20');
      }

      let apiBaseUrl = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8081';
      if (apiBaseUrl.endsWith('/')) {
        apiBaseUrl = apiBaseUrl.slice(0, -1);
      }
      
      const startTime = performance.now();
      const response = await fetch(`${apiBaseUrl}/api/v1/pack`, {
        method: 'POST',
        body: formData,
      });
      const endTime = performance.now();
      const timeTaken = ((endTime - startTime) / 1000).toFixed(2);

      const data = await response.json();

      if (!response.ok) {
        alert("Error from Seiton Engine: " + data.error);
        setIsProcessing(false);
        navigate('/');
        return;
      }

      setExecutionMatrix(data.sequence);
      if (data.container_size) {
        setContainerSize(data.container_size);
      }
      if (data.space_utilization_pct) {
        setStats({ spaceUtilization: data.space_utilization_pct, execTime: timeTaken });
      } else {
        setStats({ spaceUtilization: 85, execTime: timeTaken });
      }
      setIsProcessing(false);
      if (mode === 'bulk') {
        navigate('/bulk');
      } else {
        navigate('/incremental');
      }
    } catch (err) {
      setIsProcessing(false);
      alert("Failed to connect to Seiton Engine Backend: " + err.message);
      navigate('/');
    }
  };

  return (
    <main className="app-shell">
      {isProcessing ? (
        <ProcessingScreen />
      ) : (
        <Routes>
          <Route path="/" element={<IngressScreen onFileUpload={handleFileUpload} />} />
          <Route path="/bulk" element={<DigitalTwinScreen uploadedFile={uploadedFile} executionMatrix={executionMatrix} packMode={packMode} containerSize={containerSize} stats={stats} />} />
          <Route path="/incremental" element={<DigitalTwinScreen uploadedFile={uploadedFile} executionMatrix={executionMatrix} packMode={packMode} containerSize={containerSize} stats={stats} />} />
        </Routes>
      )}
    </main>
  );
}

export default App;
