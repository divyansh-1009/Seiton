import { useState } from 'react';
import IngressScreen from './components/IngressScreen';
import ProcessingScreen from './components/ProcessingScreen';
import DigitalTwinScreen from './components/DigitalTwinScreen';
import './index.css';

function App() {
  const [screen, setScreen] = useState('ingress'); // 'ingress', 'processing', 'twin'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [executionMatrix, setExecutionMatrix] = useState([]);

  const [packMode, setPackMode] = useState('bulk');

  const handleFileUpload = async (file, mode, config = {}) => {
    setUploadedFile(file);
    setPackMode(mode);
    setScreen('processing');
    
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

      const response = await fetch('http://localhost:8081/api/v1/pack', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        alert("Error from Seiton Engine: " + data.error);
        setScreen('ingress');
        return;
      }

      setExecutionMatrix(data.sequence);
      setScreen('twin');
      document.body.classList.add("digital-twin-active");
    } catch (err) {
      alert("Failed to connect to Seiton Engine Backend: " + err.message);
      setScreen('ingress');
    }
  };

  return (
    <main className="app-shell">
      {screen === 'ingress' && <IngressScreen onFileUpload={handleFileUpload} />}
      {screen === 'processing' && <ProcessingScreen />}
      {screen === 'twin' && <DigitalTwinScreen uploadedFile={uploadedFile} executionMatrix={executionMatrix} packMode={packMode} />}
    </main>
  );
}

export default App;
