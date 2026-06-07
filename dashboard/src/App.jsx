import { useState } from 'react';
import IngressScreen from './components/IngressScreen';
import ProcessingScreen from './components/ProcessingScreen';
import DigitalTwinScreen from './components/DigitalTwinScreen';
import './index.css';

function App() {
  const [screen, setScreen] = useState('ingress'); // 'ingress', 'processing', 'twin'
  const [uploadedFile, setUploadedFile] = useState(null);
  const [executionMatrix, setExecutionMatrix] = useState([]);

  // to be removed after integrating backend and optimization
  const generateDynamicMatrix = () => {
    const numBoxes = Math.floor(Math.random() * 4) + 3; // 3 to 6 boxes
    const matrix = [];
    
    let targetZOffset = -3;
    let targetXOffset = 0;

    for (let i = 0; i < numBoxes; i++) {
      const width = (Math.random() * 1.5 + 1.2).toFixed(1);
      const height = (Math.random() * 0.8 + 1.0).toFixed(1);
      const depth = (Math.random() * 1.5 + 1.2).toFixed(1);
      
      const sourceZ = (Math.random() * 8 - 4).toFixed(1); // Random source position along Z
      const sourceX = (Math.random() * -2 - 6).toFixed(1); // Source X in the staging area

      // Arrange sequentially in the target area
      if (i % 2 === 0 && i !== 0) {
          targetZOffset += Number(depth) + 0.2;
          targetXOffset = 0;
      }
      
      const targetX = targetXOffset.toFixed(1);
      const targetZ = targetZOffset.toFixed(1);
      
      targetXOffset += Number(width) + 0.2;

      matrix.push({
        id: `BX-${String(i + 1).padStart(2, '0')}`,
        size: [Number(width), Number(height), Number(depth)],
        source_coordinate: [Number(sourceX), Number(height) / 2, Number(sourceZ)],
        target_coordinate: [Number(targetX), Number(height) / 2, Number(targetZ)],
      });
    }
    return matrix;
  };

  const handleFileUpload = (file) => {
    setUploadedFile(file);
    setScreen('processing');
    
    // Simulate API delay and generate dynamic matrix
    setTimeout(() => {
      setExecutionMatrix(generateDynamicMatrix());
      setScreen('twin');
      // allow scrolling when twin is active
      document.body.classList.add("digital-twin-active");
    }, 3000);
  };

  return (
    <main className="app-shell">
      {screen === 'ingress' && <IngressScreen onFileUpload={handleFileUpload} />}
      {screen === 'processing' && <ProcessingScreen />}
      {screen === 'twin' && <DigitalTwinScreen uploadedFile={uploadedFile} executionMatrix={executionMatrix} />}
    </main>
  );
}

export default App;
