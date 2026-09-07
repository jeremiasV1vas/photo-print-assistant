import { useState, useMemo } from 'react';
import './index.css';
import { generatePDF, layoutPhotos } from './pdfGenerator.js';
import SheetPreview from './SheetPreview.jsx';

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

  const handleRotate = () => {
    const nextRotation = ((photo.rotation || 0) + 90) % 360;
    onUpdate(photo.id, { rotation: nextRotation });
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

      // Convertir la imagen a base64 en el renderer
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(photo.file);
      });

      const result = await window.electronAPI.analyzeImage(base64, photo.mimeType, targetSize);
      setAiResult(result);

      // Si la IA sugiere rotación y el usuario no la rotó, podemos ofrecer aplicarla
    } catch (error) {
      setAiResult({ success: false, error: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAiRotation = () => {
    if (aiResult?.suggestedRotation) {
      onUpdate(photo.id, { rotation: aiResult.suggestedRotation });
    }
  };

  const currentRotation = photo.rotation || 0;

  return (
    <div className="photo-card">
      <div className="img-wrapper">
        <img
          src={photo.url}
          alt={photo.name}
          style={{
            transform: `rotate(${currentRotation}deg)`,
            transition: 'transform 0.3s ease',
          }}
        />
        {aiResult && aiResult.success && <div className="ai-badge">✓ IA</div>}
        <button className="btn-remove" onClick={() => onRemove(photo.id)} title="Quitar foto">✕</button>
      </div>

      <div className="photo-info">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="photo-name" title={photo.name}>{photo.name}</span>
          <button
            type="button"
            className="card-rotate-btn"
            onClick={handleRotate}
            title="Girar 90 grados"
          >
            ↻ {currentRotation !== 0 ? `${currentRotation}°` : 'Girar'}
          </button>
        </div>

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
            <div>{aiResult.error || aiResult.message}</div>
            {aiResult.success && aiResult.suggestedRotation && aiResult.suggestedRotation !== currentRotation && (
              <button
                style={{
                  marginTop: '0.4rem',
                  padding: '3px 8px',
                  fontSize: '0.75rem',
                  background: '#059669',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
                onClick={applyAiRotation}
              >
                Aplicar giro de {aiResult.suggestedRotation}°
              </button>
            )}
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
  const [activeTab, setActiveTab] = useState('photos'); // 'photos' | 'preview'
  const [manualPageAssignments, setManualPageAssignments] = useState(null);

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
        file,
        mimeType: file.type || 'image/jpeg',
        url,
        size: '10x15',
        customWidth: '',
        customHeight: '',
        originalRatio: dimensions.ratio,
        rotation: 0,
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

  const updatePhoto = (id, updates) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removePhoto = (id) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    if (manualPageAssignments) {
      const nextAssignments = { ...manualPageAssignments };
      delete nextAssignments[id];
      setManualPageAssignments(nextAssignments);
    }
    setPdfResult(null);
  };

  const handleResetLayout = () => {
    setManualPageAssignments(null);
  };

  // Cálculo del layout actual para conocer el total de hojas
  const layout = useMemo(() => {
    return layoutPhotos(photos, paperSize, manualPageAssignments);
  }, [photos, paperSize, manualPageAssignments]);

  const totalPages = Math.max(layout.pages.length, 1);

  const handleGeneratePDF = async () => {
    const invalid = photos.filter(p => p.size === 'custom' && (!p.customWidth || !p.customHeight));
    if (invalid.length > 0) {
      alert(`Faltan medidas personalizadas en ${invalid.length} foto(s). Completalas antes de generar el PDF.`);
      setActiveTab('photos');
      return;
    }
    setIsGenerating(true);
    setPdfResult(null);
    try {
      const pageCount = await generatePDF(photos, paperSize, layout);
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
            {/* Barra de Pestañas / Pasos */}
            <div className="app-tabs">
              <button
                className={`tab-btn ${activeTab === 'photos' ? 'active' : ''}`}
                onClick={() => setActiveTab('photos')}
              >
                <span>🖼️ 1. Fotos y Medidas</span>
                <span className="tab-badge">{photos.length}</span>
              </button>
              <button
                className={`tab-btn ${activeTab === 'preview' ? 'active' : ''}`}
                onClick={() => setActiveTab('preview')}
              >
                <span>📄 2. Vista Previa de Hojas</span>
                <span className="tab-badge">{totalPages} {totalPages === 1 ? 'hoja' : 'hojas'}</span>
              </button>
            </div>

            {/* Pestaña 1: Grilla de fotos */}
            {activeTab === 'photos' && (
              <>
                <div className="gallery-header">
                  <h2>Fotos cargadas ({photos.length})</h2>
                  <div className="gallery-actions">
                    <button
                      className="btn-secondary"
                      onClick={() => document.getElementById('file-upload-more').click()}
                    >
                      + Agregar más fotos
                    </button>
                    <input
                      id="file-upload-more"
                      type="file"
                      multiple
                      accept="image/png, image/jpeg, image/jpg"
                      onChange={handleFileSelect}
                      style={{ display: 'none' }}
                    />
                    <button
                      className="btn-primary"
                      onClick={() => setActiveTab('preview')}
                    >
                      Ver Hojas ({totalPages}) ➔
                    </button>
                  </div>
                </div>

                <div className="photo-grid">
                  {photos.map(photo => (
                    <PhotoCard
                      key={photo.id}
                      photo={photo}
                      onUpdate={updatePhoto}
                      onRemove={removePhoto}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Pestaña 2: Visor de Hojas (SheetPreview) */}
            {activeTab === 'preview' && (
              <SheetPreview
                photos={photos}
                paperKey={paperSize}
                onUpdatePhoto={updatePhoto}
                manualPageAssignments={manualPageAssignments}
                onUpdatePageAssignments={setManualPageAssignments}
                onResetLayout={handleResetLayout}
              />
            )}

            {/* Panel inferior de configuración de papel y generación de PDF */}
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
                  {isGenerating ? '⏳ Generando PDF...' : `🖨️ Generar PDF (${totalPages} hoja${totalPages > 1 ? 's' : ''})`}
                </button>
              </div>

              {pdfResult && (
                <div className={`pdf-result ${pdfResult.success ? '' : 'error'}`}>
                  {pdfResult.success
                    ? `✅ ¡Listo! Se generó el archivo PDF con ${pdfResult.pages} hoja${pdfResult.pages > 1 ? 's' : ''}. Ya podés imprimirlo.`
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
