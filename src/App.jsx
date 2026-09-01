import { useState } from 'react';
import './index.css';

const STANDARD_SIZES = ['9x13', '10x15', '13x18', '15x21', '20x30'];

function PhotoCard({ photo, onUpdate }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleSizeChange = (e) => {
    onUpdate(photo.id, { size: e.target.value });
    setAiResult(null); // Reset AI result when size changes
  };

  const handleAnalyze = async () => {
    if (!window.electronAPI) {
      alert("La conexión con el sistema local no está disponible en este entorno.");
      return;
    }
    
    setIsAnalyzing(true);
    try {
      const result = await window.electronAPI.analyzeImage(photo.path, photo.size);
      setAiResult(result);
    } catch (error) {
      console.error(error);
      setAiResult({ success: false, error: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="photo-card">
      <div className="img-wrapper">
        <img src={photo.url} alt={photo.name} />
        {aiResult && aiResult.success && (
          <div className="ai-badge">✓ Ajustado por IA</div>
        )}
      </div>
      
      <div className="photo-info">
        <span className="photo-name" title={photo.name}>{photo.name}</span>
        
        <div className="photo-controls">
          <label>Tamaño:</label>
          <select value={photo.size} onChange={handleSizeChange} className="size-select">
            {STANDARD_SIZES.map(s => <option key={s} value={s}>{s} cm</option>)}
            <option value="custom">Personalizado...</option>
          </select>
        </div>

        {photo.size === 'custom' && (
          <div className="custom-size-inputs">
            <input type="number" placeholder="Ancho" onChange={e => onUpdate(photo.id, { customWidth: e.target.value })} />
            <span>x</span>
            <input type="number" placeholder="Alto" onChange={e => onUpdate(photo.id, { customHeight: e.target.value })} />
            <span>cm</span>
          </div>
        )}

        <button 
          className={`btn-ai ${isAnalyzing ? 'loading' : ''}`}
          onClick={handleAnalyze}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? 'Analizando...' : '✨ Ajustar con IA'}
        </button>

        {aiResult && aiResult.message && (
          <div className={`ai-feedback ${!aiResult.success ? 'error' : ''}`}>
            {aiResult.message}
          </div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [photos, setPhotos] = useState([]);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = (files) => {
    const filesArray = Array.from(files).filter(file => 
      file.type.startsWith('image/')
    );
    
    const newPhotos = filesArray.map(file => ({
      id: Math.random().toString(36).substring(7),
      name: file.name,
      path: file.path,
      url: URL.createObjectURL(file),
      size: '10x15' // Default size
    }));
    
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const updatePhoto = (id, updates) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <h1>Photo Print Assistant</h1>
        <p>Acomodá tus fotos para imprimir fácilmente</p>
      </header>

      <main className="main-content">
        {photos.length === 0 ? (
          <div 
            className={`drop-zone ${isDragging ? 'dragging' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('file-upload').click()}
          >
            <div className="drop-zone-content">
              <span className="icon">📸</span>
              <h2>Arrastrá y soltá tus fotos aquí</h2>
              <p>O hacé clic para buscar en Descargas</p>
              <input 
                id="file-upload" 
                type="file" 
                multiple 
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileSelect}
                style={{ display: 'none' }} 
              />
            </div>
          </div>
        ) : (
          <div className="gallery">
            <div className="gallery-header">
              <h2>Fotos Cargadas ({photos.length})</h2>
              <button className="btn-primary" onClick={() => document.getElementById('file-upload-more').click()}>
                Agregar más fotos
              </button>
              <input 
                id="file-upload-more" 
                type="file" 
                multiple 
                accept="image/png, image/jpeg, image/jpg"
                onChange={handleFileSelect}
                style={{ display: 'none' }} 
              />
            </div>
            <div className="photo-grid">
              {photos.map(photo => (
                <PhotoCard key={photo.id} photo={photo} onUpdate={updatePhoto} />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
