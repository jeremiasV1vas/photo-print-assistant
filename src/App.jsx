import { useState, useMemo } from 'react';
import './index.css';
import { generatePDF, layoutPhotos } from './pdfGenerator.js';
import SheetPreview from './SheetPreview.jsx';

const PRESET_SIZES = [
  { label: '10 × 15', w: 10, h: 15 },
  { label: '13 × 18', w: 13, h: 18 },
  { label: '15 × 21', w: 15, h: 21 },
  { label: '9 × 13', w: 9, h: 13 },
  { label: '20 × 30', w: 20, h: 30 },
];

const PAPER_OPTIONS = ['A4', 'Carta'];

// ─────────────────────────────────────────
// Componente de tarjeta de foto individual
// ─────────────────────────────────────────
function PhotoCard({ photo, onUpdate, onRemove }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const currentW = parseFloat(photo.widthCM) || 10;
  const currentH = parseFloat(photo.heightCM) || 15;
  const currentRotation = photo.rotation || 0;
  const isRatioLocked = photo.isRatioLocked ?? false;

  const handleWidthChange = (e) => {
    const val = e.target.value;
    const num = parseFloat(val);
    let newH = photo.heightCM;
    if (isRatioLocked && num > 0 && photo.originalRatio) {
      newH = (num / photo.originalRatio).toFixed(1);
    }
    onUpdate(photo.id, { widthCM: val, heightCM: newH });
    setAiResult(null);
  };

  const handleHeightChange = (e) => {
    const val = e.target.value;
    const num = parseFloat(val);
    let newW = photo.widthCM;
    if (isRatioLocked && num > 0 && photo.originalRatio) {
      newW = (num * photo.originalRatio).toFixed(1);
    }
    onUpdate(photo.id, { heightCM: val, widthCM: newW });
    setAiResult(null);
  };

  const handlePresetSelect = (preset) => {
    onUpdate(photo.id, { widthCM: preset.w, heightCM: preset.h });
    setAiResult(null);
  };

  const toggleRatioLock = () => {
    onUpdate(photo.id, { isRatioLocked: !isRatioLocked });
  };

  const handleRotate = () => {
    const nextRotation = (currentRotation + 90) % 360;
    onUpdate(photo.id, { rotation: nextRotation });
  };

  const handleAnalyze = async () => {
    if (!window.electronAPI) {
      alert("La conexión con el sistema local no está disponible en este entorno.");
      return;
    }
    setIsAnalyzing(true);
    try {
      const targetSize = `${currentW}x${currentH}`;

      // Convertir imagen a base64
      const base64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(photo.file);
      });

      const result = await window.electronAPI.analyzeImage(base64, photo.mimeType, targetSize);
      setAiResult(result);
    } catch (error) {
      setAiResult({ success: false, error: error.message });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applyAiRotation = () => {
    if (aiResult?.suggestedRotation !== undefined) {
      onUpdate(photo.id, { rotation: aiResult.suggestedRotation });
    }
  };

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
        <div className="photo-title-row">
          <span className="photo-name" title={photo.name}>{photo.name}</span>
          <button
            type="button"
            className="card-rotate-btn"
            onClick={handleRotate}
            title="Girar foto 90 grados"
          >
            ↻ {currentRotation !== 0 ? `${currentRotation}°` : 'Girar'}
          </button>
        </div>

        {/* Sección de medidas personalizada siempre visible y prioritaria */}
        <div className="size-section">
          <div className="size-inputs-row">
            <div className="size-input-group">
              <label>Ancho (cm):</label>
              <input
                type="number"
                value={photo.widthCM}
                onChange={handleWidthChange}
                min="1"
                step="0.5"
                placeholder="10"
              />
            </div>

            <button
              type="button"
              className={`btn-ratio-lock ${isRatioLocked ? 'locked' : 'unlocked'}`}
              onClick={toggleRatioLock}
              title={isRatioLocked ? "Proporción bloqueada (clic para desbloquear)" : "Proporción libre (clic para bloquear)"}
            >
              {isRatioLocked ? '🔒' : '🔓'}
            </button>

            <div className="size-input-group">
              <label>Alto (cm):</label>
              <input
                type="number"
                value={photo.heightCM}
                onChange={handleHeightChange}
                min="1"
                step="0.5"
                placeholder="15"
              />
            </div>
          </div>

          {/* Botones de tamaños estándar sugeridos para rellenar con un clic */}
          <div className="preset-buttons-container">
            <span className="preset-label">O elegí un tamaño rápido:</span>
            <div className="preset-buttons">
              {PRESET_SIZES.map(p => {
                const isSelected = Math.abs(currentW - p.w) < 0.1 && Math.abs(currentH - p.h) < 0.1;
                return (
                  <button
                    key={p.label}
                    type="button"
                    className={`btn-preset-size ${isSelected ? 'active' : ''}`}
                    onClick={() => handlePresetSelect(p)}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Botón de Asistente de IA */}
        <button
          type="button"
          className={`btn-ai ${isAnalyzing ? 'loading' : ''}`}
          onClick={handleAnalyze}
          disabled={isAnalyzing || !currentW || !currentH}
        >
          {isAnalyzing ? 'Analizando con IA...' : '✨ Ajustar con IA'}
        </button>

        {aiResult && (
          <div className={`ai-feedback ${!aiResult.success ? 'error' : ''}`}>
            <div>{aiResult.error || aiResult.message}</div>
            {aiResult.success && aiResult.suggestedRotation !== undefined && aiResult.suggestedRotation !== currentRotation && (
              <button
                type="button"
                className="btn-apply-ai"
                onClick={applyAiRotation}
              >
                Girar {aiResult.suggestedRotation}° como sugiere la IA
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
        widthCM: 10,
        heightCM: 15,
        isRatioLocked: false,
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

  // Cálculo del layout en tiempo real sincronizado
  const layout = useMemo(() => {
    return layoutPhotos(photos, paperSize, manualPageAssignments);
  }, [photos, paperSize, manualPageAssignments]);

  const totalPages = Math.max(layout.pages.length, 1);

  const handleGeneratePDF = async () => {
    const invalid = photos.filter(p => !parseFloat(p.widthCM) || !parseFloat(p.heightCM));
    if (invalid.length > 0) {
      alert(`Faltan medidas válidas en ${invalid.length} foto(s). Por favor revisá que tengan ancho y alto.`);
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
          <div className="workspace-layout">
            {/* COLUMNA IZQUIERDA: Fotos y configuración de medidas */}
            <section className="photos-column">
              <div className="column-header">
                <h2>Fotos cargadas ({photos.length})</h2>
                <div className="column-actions">
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
                </div>
              </div>

              <div className="photo-grid-scroll">
                {photos.map(photo => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    onUpdate={updatePhoto}
                    onRemove={removePhoto}
                  />
                ))}
              </div>
            </section>

            {/* COLUMNA DERECHA: Vista previa en vivo de la Hoja y panel de impresión */}
            <aside className="preview-column">
              <div className="preview-sticky-wrapper">
                <div className="preview-title-row">
                  <h2>📄 Vista previa de la hoja</h2>
                  <span className="live-badge">En vivo</span>
                </div>

                {/* Visor de Hoja Real */}
                <SheetPreview
                  photos={photos}
                  paperKey={paperSize}
                  onUpdatePhoto={updatePhoto}
                  manualPageAssignments={manualPageAssignments}
                  onUpdatePageAssignments={setManualPageAssignments}
                  onResetLayout={handleResetLayout}
                />

                {/* Panel inferior de impresión / PDF */}
                <div className="pdf-panel">
                  <div className="pdf-panel-row">
                    <div className="paper-selector-block">
                      <label className="pdf-label">Tamaño de hoja:</label>
                      <div className="paper-buttons">
                        {PAPER_OPTIONS.map(p => (
                          <button
                            key={p}
                            type="button"
                            className={`btn-paper ${paperSize === p ? 'active' : ''}`}
                            onClick={() => setPaperSize(p)}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      id="generate-pdf-btn"
                      type="button"
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
                        ? `✅ ¡Listo! Se generó el PDF en ${pdfResult.pages} hoja${pdfResult.pages > 1 ? 's' : ''}. Ya podés imprimirlo.`
                        : `❌ Error: ${pdfResult.error}`}
                    </div>
                  )}
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
