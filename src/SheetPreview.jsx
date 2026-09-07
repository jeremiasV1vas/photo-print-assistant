import { MARGIN, layoutPhotos, parseSizeMM } from './pdfGenerator.js';

export default function SheetPreview({
  photos,
  paperKey = 'A4',
  onUpdatePhoto,
  manualPageAssignments,
  onUpdatePageAssignments,
  onResetLayout,
}) {
  // Distribución de fotos en todas las hojas
  const { pages, paper } = layoutPhotos(photos, paperKey, manualPageAssignments);
  const totalPages = Math.max(pages.length, 1);

  const handleRotate = (photoId, currentRotation = 0) => {
    const nextRotation = (currentRotation + 90) % 360;
    onUpdatePhoto(photoId, { rotation: nextRotation });
  };

  const handleMovePage = (photoId, targetPage) => {
    const newAssignments = manualPageAssignments ? { ...manualPageAssignments } : {};
    if (!manualPageAssignments) {
      pages.forEach((pageItems, pIdx) => {
        pageItems.forEach(item => {
          newAssignments[item.photo.id] = pIdx;
        });
      });
    }

    newAssignments[photoId] = targetPage;
    onUpdatePageAssignments(newAssignments);
  };

  const marginPercentX = ((MARGIN / paper.width) * 100).toFixed(2);
  const marginPercentY = ((MARGIN / paper.height) * 100).toFixed(2);

  return (
    <div className="sheets-all-container">
      {manualPageAssignments && (
        <div className="sheets-header-actions">
          <button
            type="button"
            className="btn-auto-layout"
            onClick={onResetLayout}
            title="Restablecer a la distribución automática"
          >
            ⚡ Reacomodar hojas automáticamente
          </button>
        </div>
      )}

      {/* Grilla adaptativa para que todas las hojas se achiquen y entren sin scroll */}
      <div className={`sheets-grid sheets-grid-${totalPages <= 4 ? totalPages : 'many'}`}>
        {pages.map((pageItems, pageIdx) => (
          <div key={pageIdx} className="sheet-card-wrapper">
            <div className="sheet-card-header">
              <span className="sheet-badge">
                📄 Hoja {pageIdx + 1} de {totalPages}
              </span>
              <span className="sheet-summary-text">
                {paper.label} • {pageItems.length} foto{pageItems.length !== 1 ? 's' : ''}
              </span>
            </div>

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

                {pageItems.length === 0 ? (
                  <div className="sheet-empty-message">
                    <span>Esta hoja está vacía.</span>
                    <p>Podés mover fotos aquí desde otra hoja.</p>
                  </div>
                ) : (
                  pageItems.map((item) => {
                    const { photo, x, y, w, h } = item;
                    const { rotation = 0 } = parseSizeMM(photo);
                    const isRotated = rotation === 90 || rotation === 270;

                    const leftPercent = (x / paper.width) * 100;
                    const topPercent = (y / paper.height) * 100;
                    const widthPercent = (w / paper.width) * 100;
                    const heightPercent = (h / paper.height) * 100;

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

                        {/* Overlay con controles */}
                        <div className="sheet-photo-overlay">
                          <span className="sheet-photo-size-badge">
                            {sizeLabelW} × {sizeLabelH} cm
                          </span>

                          <div className="sheet-photo-actions">
                            <button
                              type="button"
                              className="btn-sheet-rotate"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRotate(photo.id, rotation);
                              }}
                              title="Girar 90°"
                            >
                              ↻ Girar
                            </button>

                            {/* Mover entre hojas con botones compactos */}
                            {totalPages > 1 && (
                              <div className="sheet-move-buttons">
                                {pageIdx > 0 && (
                                  <button
                                    type="button"
                                    className="btn-sheet-move"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMovePage(photo.id, pageIdx - 1);
                                    }}
                                    title={`Mover a la hoja ${pageIdx}`}
                                  >
                                    ◀ H{pageIdx}
                                  </button>
                                )}
                                {pageIdx < totalPages - 1 && (
                                  <button
                                    type="button"
                                    className="btn-sheet-move"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMovePage(photo.id, pageIdx + 1);
                                    }}
                                    title={`Mover a la hoja ${pageIdx + 2}`}
                                  >
                                    H{pageIdx + 2} ▶
                                  </button>
                                )}
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
          </div>
        ))}
      </div>
    </div>
  );
}
