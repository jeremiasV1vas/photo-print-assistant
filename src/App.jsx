import { useState } from 'react';
import './index.css';
import { generatePDF } from './pdfGenerator.js';

const STANDARD_SIZES = ['9x13', '10x15', '13x18', '15x21', '20x30'];
const PAPER_OPTIONS = ['A4', 'Carta'];

// ─────────────────────────────────────────
// Componente de tarjeta de foto individual
// ─────────────────────────────────────────
function PhotoCard({ photo, onUpdate, onRemove }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleSizeChange = (e) => {
    onUpdate(photo.id, { size: e.target.value });
    setAiResult(null);
  };

  const handleCustomWidth = (e) => {
    const w = parseFloat(e.target.value);
    const h = w && photo.originalRatio ? (w / photo.originalRatio).toFixed(2) : '';
    onUpdate(photo.id, { customWidth: e.target.value, customHeight: h });
  };

  const handleCustomHeight = (e) => {
    const h = parseFloat(e.target.value);
    const w = h && photo.originalRatio ? (h * photo.originalRatio).toFixed(2) : '';
    onUpdate(photo.id, { customHeight: e.target.value, customWidth: w });
  };

  const handleAnalyze = async () => {
    if (!window.electronAPI) {
      alert("La conexión con el sistema local no está disponible en este entorno.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const targetSize = photo.size === 'custom'
        ? `${photo.customWidth}x${photo.customHeight}`
        : photo.size;
      const result = await window.electronAPI.analyzeImage(photo.path, targetSize);
      setAiResult(result);
    } catch (error) {
      setAiResult({ success: false, error: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const displaySize = photo.size === 'custom'
    ? (photo.customWidth && photo.customHeight ? `${photo.customWidth}×${photo.customHeight} cm` : 'Personalizado')
    : `${photo.size} cm`;

  return (
    <div className="photo-card">
      <div className="img-wrapper">
        <img src={photo.url} alt={photo.name} />
        {aiResult && aiResult.success && <div className="ai-badge">✓ IA</div>}
        <button className="btn-remove" onClick={() => onRemove(photo.id)} title="Quitar foto">✕</button>
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
            <input type="number" placeholder="Ancho" value={photo.customWidth} onChange={handleCustomWidth} min="0" step="0.1" />
            <span title="Proporción original bloqueada">🔒</span>
            <input type="number" placeholder="Alto" value={photo.customHeight} onChange={handleCustomHeight} min="0" step="0.1" />
            <span>cm</span>
          </div>
        )}

        <button
          className={`btn-ai ${isAnalyzing ? 'loading' : ''}`}
          onClick={handleAnalyze}
          disabled={isAnalyzing || (photo.size === 'custom' && (!photo.customWidth || !photo.customHeight))}
        >
          {isAnalyzing ? 'Analizando...' : '✨ Ajustar con IA'}
        </button>

        {aiResult && (
          <div className={`ai-feedback ${!aiResult.success ? 'error' : ''}`}>
            {aiResult.error || aiResult.message}
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────
// App principal
// ─────────────────────────────────────────
function App() {
  const [isDragging, setIsDragging] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [paperSize, setPaperSize] = useState('A4');
  const [isGenerating, setIsGenerating] = useState(false);
  const [pdfResult, setPdfResult] = useState(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    if (!isDragging) setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const processFiles = async (files) => {
    const filesArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    const newPhotos = await Promise.all(filesArray.map(async file => {
      const url = URL.createObjectURL(file);
      const dimensions = await new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve({ ratio: img.naturalWidth / img.naturalHeight });
        img.src = url;
      });
      return {
        id: Math.random().toString(36).substring(7),
        name: file.name,
        path: file.path,
        url,
        size: '10x15',
        customWidth: '',
        customHeight: '',
        originalRatio: dimensions.ratio,
      };
    }));
    setPhotos(prev => [...prev, ...newPhotos]);
    setPdfResult(null);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length > 0) processFiles(e.dataTransfer.files);
  };

  const handleFileSelect = (e) => {
    if (e.target.files?.length > 0) processFiles(e.target.files);
  };

  const updatePhoto = (id, updates) =>
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));

  const removePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    setPdfResult(null);
  };

  const handleGeneratePDF = async () => {
    // Validar que todas las fotos tienen tamaño definido
    const invalid = photos.filter(p => p.size === 'custom' && (!p.customWidth || !p.customHeight));
    if (invalid.length > 0) {
      alert(`Faltan medidas personalizadas en ${invalid.length} foto(s). Completalas antes de generar el PDF.`);
      return;
    }
    setIsGenerating(true);
    setPdfResult(null);
    try {
      const pageCount = await generatePDF(photos, paperSize);
      setPdfResult({ success: true, pages: pageCount });
    } catch (err) {
      setPdfResult({ success: false, error: err.message });
    } finally {
      setIsGenerating(false);
    }
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
              <input id="file-upload" type="file" multiple accept="image/png, image/jpeg, image/jpg" onChange={handleFileSelect} style={{ display: 'none' }} />
            </div>
          </div>
        ) : (
          <div className="gallery">
            {/* Encabezado de galería */}
            <div className="gallery-header">
              <h2>Fotos ({photos.length})</h2>
              <div className="gallery-actions">
                <button className="btn-secondary" onClick={() => document.getElementById('file-upload-more').click()}>
                  + Agregar
                </button>
                <input id="file-upload-more" type="file" multiple accept="image/png, image/jpeg, image/jpg" onChange={handleFileSelect} style={{ display: 'none' }} />
              </div>
            </div>

            {/* Grilla de fotos */}
            <div className="photo-grid">
              {photos.map(photo => (
                <PhotoCard key={photo.id} photo={photo} onUpdate={updatePhoto} onRemove={removePhoto} />
              ))}
            </div>

            {/* Panel de generación de PDF */}
            <div className="pdf-panel">
              <div className="pdf-panel-row">
                <label className="pdf-label">Tamaño de hoja:</label>
                <div className="paper-buttons">
                  {PAPER_OPTIONS.map(p => (
                    <button
                      key={p}
                      className={`btn-paper ${paperSize === p ? 'active' : ''}`}
                      onClick={() => setPaperSize(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <button
                  id="generate-pdf-btn"
                  className={`btn-generate ${isGenerating ? 'loading' : ''}`}
                  onClick={handleGeneratePDF}
                  disabled={isGenerating}
                >
                  {isGenerating ? '⏳ Generando...' : '🖨️ Generar PDF'}
                </button>
              </div>

              {pdfResult && (
                <div className={`pdf-result ${pdfResult.success ? '' : 'error'}`}>
                  {pdfResult.success
                    ? `✅ ¡Listo! Se generó el PDF en ${pdfResult.pages} hoja${pdfResult.pages > 1 ? 's' : ''}. Revisá tu carpeta de Descargas.`
                    : `❌ Error: ${pdfResult.error}`}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
