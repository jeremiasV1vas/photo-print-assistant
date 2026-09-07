import { useState } from 'react';
import { MARGIN, layoutPhotos, parseSizeMM } from './pdfGenerator.js';

export default function SheetPreview({
  photos,
  paperKey = 'A4',
  onUpdatePhoto,
  manualPageAssignments,
  onUpdatePageAssignments,
  onResetLayout,
}) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  // Calcular distribución actual
  const { pages, paper } = layoutPhotos(photos, paperKey, manualPageAssignments);
  const totalPages = Math.max(pages.length, 1);

  // Asegurarnos de que el índice actual no quede fuera de rango
  const activePageIndex = Math.min(currentPageIndex, totalPages - 1);
  const currentItems = pages[activePageIndex] || [];

  const handleRotate = (photoId, currentRotation = 0) => {
    const nextRotation = (currentRotation + 90) % 360;
    onUpdatePhoto(photoId, { rotation: nextRotation });
  };

  const handleMovePage = (photoId, targetPage) => {
    // Si aún no hay asignaciones manuales, inicializamos con la distribución actual
    const newAssignments = manualPageAssignments ? { ...manualPageAssignments } : {};
    
    // Si no estaban asignadas, rellenamos las actuales para que no se reorganicen solas
    if (!manualPageAssignments) {
      pages.forEach((pageItems, pIdx) => {
        pageItems.forEach(item => {
          newAssignments[item.photo.id] = pIdx;
        });
      });
    }

    newAssignments[photoId] = targetPage;
    onUpdatePageAssignments(newAssignments);
    setCurrentPageIndex(targetPage);
  };

  const marginPercentX = ((MARGIN / paper.width) * 100).toFixed(2);
  const marginPercentY = ((MARGIN / paper.height) * 100).toFixed(2);

  return (
    <div className="sheet-preview-container">
      {/* Barra superior de control de la vista previa */}
      <div className="sheet-preview-header">
        <div className="sheet-page-info">
          <span className="sheet-badge">
            📄 Hoja {activePageIndex + 1} de {totalPages}
          </span>
          <span className="sheet-summary-text">
            {paper.label} • {photos.length} foto{photos.length !== 1 ? 's' : ''} en total
          </span>
        </div>

        {(totalPages > 1 || manualPageAssignments) && (
          <div className="sheet-page-controls">
            {totalPages > 1 && (
              <>
                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() => setCurrentPageIndex(prev => Math.max(0, prev - 1))}
                  disabled={activePageIndex === 0}
                  title="Ver hoja anterior"
                >
                  ◀ Anterior
                </button>

                <div className="page-pills">
                  {pages.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className={`page-pill ${idx === activePageIndex ? 'active' : ''}`}
                      onClick={() => setCurrentPageIndex(idx)}
                    >
                      {idx + 1}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  className="btn-page-nav"
                  onClick={() => setCurrentPageIndex(prev => Math.min(totalPages - 1, prev + 1))}
                  disabled={activePageIndex >= totalPages - 1}
                  title="Ver hoja siguiente"
                >
                  Siguiente ▶
                </button>
              </>
            )}

            {manualPageAssignments && (
              <button
                type="button"
                className="btn-auto-layout"
                onClick={onResetLayout}
                title="Restablecer a la distribución automática óptima"
              >
                ⚡ Reacomodar
              </button>
            )}
          </div>
        )}
      </div>

      {/* Visor de la Hoja (Proporción exacta A4 o Carta) */}
      <div className="sheet-stage">
        <div
          className="sheet-paper"
          style={{
            aspectRatio: `${paper.width} / ${paper.height}`,
          }}
        >
          {/* Guía de margen imprimible (4mm) */}
          <div
            className="sheet-margin-guide"
            style={{
              top: `${marginPercentY}%`,
              left: `${marginPercentX}%`,
              right: `${marginPercentX}%`,
              bottom: `${marginPercentY}%`,
            }}
          />

          {currentItems.length === 0 ? (
            <div className="sheet-empty-message">
              <span>Esta hoja está vacía.</span>
              <p>Podés mover fotos aquí desde otra hoja.</p>
            </div>
          ) : (
            currentItems.map((item) => {
              const { photo, x, y, w, h } = item;
              const { rotation = 0 } = parseSizeMM(photo);
              const isRotated = rotation === 90 || rotation === 270;

              const leftPercent = (x / paper.width) * 100;
              const topPercent = (y / paper.height) * 100;
              const widthPercent = (w / paper.width) * 100;
              const heightPercent = (h / paper.height) * 100;

              // Dimensiones para mostrar en cm
              const sizeLabelW = (w / 10).toFixed(1).replace('.0', '');
              const sizeLabelH = (h / 10).toFixed(1).replace('.0', '');

              return (
                <div
                  key={photo.id}
                  className="sheet-photo-item"
                  style={{
                    left: `${leftPercent}%`,
                    top: `${topPercent}%`,
                    width: `${widthPercent}%`,
                    height: `${heightPercent}%`,
                  }}
                  title={`${photo.name} (${sizeLabelW} × ${sizeLabelH} cm)`}
                >
                  {/* Contenedor de recorte para la imagen */}
                  <div className="sheet-img-cropper">
                    <img
                      src={photo.url}
                      alt={photo.name}
                      style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        width: isRotated ? `${(h / w) * 100}%` : '100%',
                        height: isRotated ? `${(w / h) * 100}%` : '100%',
                        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                        objectFit: 'cover',
                      }}
                    />
                  </div>

                  {/* Barra de herramientas sobre la foto en la hoja */}
                  <div className="sheet-photo-overlay">
                    <span className="sheet-photo-size-badge">
                      {sizeLabelW} × {sizeLabelH} cm
                    </span>

                    <div className="sheet-photo-actions">
                      <button
                        className="btn-sheet-rotate"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRotate(photo.id, rotation);
                        }}
                        title="Girar 90° para acomodar mejor"
                      >
                        ↻ Girar
                      </button>

                      {/* Mover a hoja anterior o siguiente si hay más de 1 hoja */}
                      {totalPages > 1 && (
                        <div className="sheet-move-buttons">
                          {activePageIndex > 0 && (
                            <button
                              className="btn-sheet-move"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleMovePage(photo.id, activePageIndex - 1);
                              }}
                              title="Mover a la hoja anterior"
                            >
                              ◀ Hoja {activePageIndex}
                            </button>
                          )}
                          <button
                            className="btn-sheet-move"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMovePage(photo.id, activePageIndex + 1);
                            }}
                            title="Mover a la hoja siguiente"
                          >
                            Hoja {activePageIndex + 2} ▶
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Leyenda aclaratoria amigable para el usuario */}
      <div className="sheet-preview-footer">
        <p>
          💡 <strong>Tip:</strong> Si hacés clic en <strong>↻ Girar</strong> en una foto, se orienta para aprovechar mejor el espacio de la hoja.
        </p>
      </div>
    </div>
  );
}
