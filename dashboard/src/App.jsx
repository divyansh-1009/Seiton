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
    return saved ? JSON.parse(saved) : null;
  });
  const [defaultConfig, setDefaultConfig] = useState(null);
  const [connectionError, setConnectionError] = useState(false);

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

  useEffect(() => {
    let active = true;
    const fetchConfig = async () => {
      try {
        let apiBaseUrl = import.meta.env.VITE_API_GATEWAY_URL || 'http://localhost:8081';
        if (apiBaseUrl.endsWith('/')) {
          apiBaseUrl = apiBaseUrl.slice(0, -1);
        }
        const res = await fetch(`${apiBaseUrl}/api/v1/config`);
        if (res.ok && active) {
          const data = await res.json();
          setDefaultConfig({
            L: data.default_container_l,
            W: data.default_container_w,
            H: data.default_container_h
          });
          if (!localStorage.getItem('seiton_container')) {
            setContainerSize([
              data.default_container_l * 0.1,
              data.default_container_h * 0.1,
              data.default_container_w * 0.1
            ]);
          }
        } else if (active) {
          setConnectionError(true);
        }
      } catch (err) {
        if (active) {
          console.error("Failed to load config from gateway:", err);
          setConnectionError(true);
        }
      }
    };
    fetchConfig();
    return () => { active = false; };
  }, []);

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
      formData.append('max_l_cm', config.containerL || defaultConfig?.L);
      formData.append('max_w_cm', config.containerW || defaultConfig?.W);
      formData.append('max_h_cm', config.containerH || defaultConfig?.H);
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
        setStats({ spaceUtilization: data.space_utilization_pct, execTime: timeTaken, requestedBoxes: mode === 'bulk' ? (config.numBoxes || '20') : null });
      } else {
        setStats({ spaceUtilization: 85, execTime: timeTaken, requestedBoxes: mode === 'bulk' ? (config.numBoxes || '20') : null });
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

  if (connectionError) {
    return (
      <main className="app-shell">
        <section className="screen screen-processing">
          <div className="panel panel-processing" style={{ borderColor: '#ff5151' }}>
            <p className="eyebrow" style={{ color: '#ff5151' }}>Connection failure</p>
            <h2 style={{ color: '#ff5151', fontSize: 'clamp(2rem, 5vw, 4rem)' }}>Engine Offline</h2>
            <p className="body-copy" style={{ color: '#ff7a7a' }}>
              Unable to retrieve container configurations from the Seiton API Gateway. 
              Please verify the backend server is running and reachable.
            </p>
            <button 
              className="cta" 
              style={{ marginTop: '1.5rem', background: '#ff5151', color: 'var(--color-base)' }}
              onClick={() => {
                setConnectionError(false);
                window.location.reload();
              }}
            >
              Retry Connection
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!defaultConfig) {
    return (
      <main className="app-shell">
        <ProcessingScreen 
          message="Connecting to Engine..." 
          eyebrow="System initialization" 
        />
      </main>
    );
  }

  return (
    <main className="app-shell">
      {isProcessing ? (
        <ProcessingScreen />
      ) : (
        <Routes>
          <Route path="/" element={<IngressScreen onFileUpload={handleFileUpload} defaultDimensions={defaultConfig} />} />
          <Route path="/bulk" element={<DigitalTwinScreen uploadedFile={uploadedFile} executionMatrix={executionMatrix} packMode={packMode} containerSize={containerSize} stats={stats} />} />
          <Route path="/incremental" element={<DigitalTwinScreen uploadedFile={uploadedFile} executionMatrix={executionMatrix} packMode={packMode} containerSize={containerSize} stats={stats} />} />
        </Routes>
      )}
    </main>
  );
}

export default App;
