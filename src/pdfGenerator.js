import { jsPDF } from 'jspdf';

// Tamaños de papel en mm
export const PAPER_SIZES = {
  A4: { width: 210, height: 297, label: 'A4 (21 × 29.7 cm)' },
  Carta: { width: 216, height: 279, label: 'Carta (21.6 × 27.9 cm)' },
};

// Margen imprimible de la hoja en mm (4mm es seguro para la gran mayoría de impresoras)
export const MARGIN = 4;

/**
 * Dado un objeto photo, devuelve { w, h, rotation } en mm.
 * Si rotation es 90 o 270, invierte ancho y alto para acomodar en la hoja.
 */
export function parseSizeMM(photo) {
  let w = 100;
  let h = 150;

  if (photo.widthCM && photo.heightCM) {
    w = (parseFloat(photo.widthCM) || 10) * 10;
    h = (parseFloat(photo.heightCM) || 15) * 10;
  } else if (photo.size === 'custom') {
    w = (parseFloat(photo.customWidth) || 10) * 10;
    h = (parseFloat(photo.customHeight) || 15) * 10;
  } else if (photo.size) {
    const parts = photo.size.split('x').map(n => parseFloat(n) * 10);
    w = parts[0] || 100;
    h = parts[1] || 150;
  }

  const rotation = photo.rotation || 0;
  const isRotated = rotation === 90 || rotation === 270;

  return {
    w: isRotated ? h : w,
    h: isRotated ? w : h,
    baseW: w,
    baseH: h,
    rotation,
  };
}

/**
 * Algoritmo de empaquetado (bin-packing greedy por filas).
 * Soporta asignación manual de hojas si se pasa manualPageAssignments = { [photoId]: pageIndex }.
 * Devuelve { pages: [ [ { photo, x, y, w, h } ] ], paper }
 */
export function layoutPhotos(photos, paperKey = 'A4', manualPageAssignments = null) {
  const paper = PAPER_SIZES[paperKey] || PAPER_SIZES.A4;
  const usableW = paper.width - MARGIN * 2;
  const usableH = paper.height - MARGIN * 2;

  if (!photos || photos.length === 0) {
    return { pages: [[]], paper };
  }

  // Si hay asignaciones manuales de página
  if (manualPageAssignments && Object.keys(manualPageAssignments).length > 0) {
    const pageIndices = Object.values(manualPageAssignments);
    const maxPage = Math.max(0, ...pageIndices);
    const pageBuckets = Array.from({ length: maxPage + 1 }, () => []);

    for (const photo of photos) {
      const pIdx = manualPageAssignments[photo.id] !== undefined ? manualPageAssignments[photo.id] : 0;
      if (!pageBuckets[pIdx]) pageBuckets[pIdx] = [];
      pageBuckets[pIdx].push(photo);
    }

    const pages = [];
    for (const bucketPhotos of pageBuckets) {
      let cursorX = MARGIN;
      let cursorY = MARGIN;
      let rowHeight = 0;
      const currentPage = [];

      for (const photo of bucketPhotos) {
        const { w, h } = parseSizeMM(photo);
        let fw = Math.min(w, usableW);
        let fh = Math.min(h, usableH);

        // ¿Cabe en la fila actual? (tolerancia 0.5mm para redondeos de bordes)
        if (cursorX + fw > paper.width - MARGIN + 0.5) {
          cursorX = MARGIN;
          cursorY += rowHeight + MARGIN;
          rowHeight = 0;
        }

        currentPage.push({ photo, x: cursorX, y: cursorY, w: fw, h: fh });
        cursorX += fw + MARGIN;
        if (fh > rowHeight) rowHeight = fh;
      }
      pages.push(currentPage);
    }
    return { pages: pages.length > 0 ? pages : [[]], paper };
  }

  // Distribución automática
  const pages = [];
  let currentPage = [];
  let cursorX = MARGIN;
  let cursorY = MARGIN;
  let rowHeight = 0;

  for (const photo of photos) {
    const { w, h } = parseSizeMM(photo);

    let fw = w;
    let fh = h;
    if (fw > usableW) {
      const scale = usableW / fw;
      fw = usableW;
      fh = fh * scale;
    }
    if (fh > usableH) {
      const scale = usableH / fh;
      fh = usableH;
      fw = fw * scale;
    }

    // ¿Cabe en la fila actual?
    if (cursorX + fw > paper.width - MARGIN + 0.5) {
      cursorX = MARGIN;
      cursorY += rowHeight + MARGIN;
      rowHeight = 0;
    }

    // ¿Cabe en la página actual?
    if (cursorY + fh > paper.height - MARGIN + 0.5) {
      pages.push(currentPage);
      currentPage = [];
      cursorX = MARGIN;
      cursorY = MARGIN;
      rowHeight = 0;
    }

    currentPage.push({ photo, x: cursorX, y: cursorY, w: fw, h: fh });
    cursorX += fw + MARGIN;
    if (fh > rowHeight) rowHeight = fh;
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return { pages: pages.length > 0 ? pages : [[]], paper };
}

/**
 * Optimiza la orientación (rotación 0° o 90°) de las fotos para usar la menor cantidad de hojas posible.
 */
export function optimizeRotations(photos, paperKey = 'A4') {
  if (!photos || photos.length === 0) return photos;

  let bestPhotos = photos.map(p => ({ ...p }));
  let bestPages = layoutPhotos(bestPhotos, paperKey).pages.length;

  // Probar variantes globales
  const globalVariants = [
    photos.map(p => ({ ...p, rotation: 0 })),
    photos.map(p => ({ ...p, rotation: 90 })),
    photos.map(p => ({ ...p, rotation: (p.originalRatio || 1) >= 1 ? 90 : 0 })),
    photos.map(p => ({ ...p, rotation: (p.originalRatio || 1) >= 1 ? 0 : 90 })),
  ];

  for (const variant of globalVariants) {
    const pagesCount = layoutPhotos(variant, paperKey).pages.length;
    if (pagesCount < bestPages) {
      bestPages = pagesCount;
      bestPhotos = variant;
    }
  }

  // Ajuste individual incremental
  for (let i = 0; i < bestPhotos.length; i++) {
    const origRot = bestPhotos[i].rotation || 0;
    const flippedRot = (origRot + 90) % 360;

    const testPhotos = bestPhotos.map((p, idx) => idx === i ? { ...p, rotation: flippedRot } : p);
    const testPages = layoutPhotos(testPhotos, paperKey).pages.length;

    if (testPages < bestPages) {
      bestPages = testPages;
      bestPhotos = testPhotos;
    }
  }

  return bestPhotos;
}

/**
 * Ajusta automáticamente el tamaño y orientación de todas las fotos
 * para que entren juntas en exactamente 1 sola hoja de papel.
 */
export function fitAllToOneSheet(photos, paperKey = 'A4') {
  if (!photos || photos.length === 0) return photos;

  let bestScaled = null;
  let bestScale = 0;

  const variants = [
    photos.map(p => ({ ...p })),
    photos.map(p => ({ ...p, rotation: ((p.originalRatio || 1) >= 1 ? 90 : 0) })),
    photos.map(p => ({ ...p, rotation: ((p.originalRatio || 1) >= 1 ? 0 : 90) })),
    photos.map(p => ({ ...p, rotation: 90 })),
    photos.map(p => ({ ...p, rotation: 0 })),
  ];

  for (const variant of variants) {
    let low = 0.05;
    let high = 4.0;
    let maxFit = 0;

    for (let iter = 0; iter < 24; iter++) {
      const mid = (low + high) / 2;
      const test = variant.map(p => {
        const ratio = p.originalRatio || 1;
        const w = 10 * mid;
        const h = (10 / ratio) * mid;
        return { ...p, widthCM: w, heightCM: h };
      });

      if (layoutPhotos(test, paperKey).pages.length === 1) {
        maxFit = mid;
        low = mid;
      } else {
        high = mid;
      }
    }

    if (maxFit > bestScale) {
      bestScale = maxFit;
      bestScaled = variant.map(p => {
        const ratio = p.originalRatio || 1;
        const w = 10 * maxFit;
        const h = (10 / ratio) * maxFit;
        return {
          ...p,
          widthCM: (Math.floor(w * 10) / 10).toFixed(1),
          heightCM: (Math.floor(h * 10) / 10).toFixed(1),
          isRatioLocked: true,
        };
      });
    }
  }

  return bestScaled || photos;
}

/**
 * Aplica un tamaño estándar masivo a todas las fotos (ej. 10x15, 13x18)
 * adaptándose a la orientación de cada foto y manteniendo su proporción.
 */
export function applyBatchSize(photos, targetW, targetH) {
  const minDim = Math.min(targetW, targetH);
  const maxDim = Math.max(targetW, targetH);

  return photos.map(p => {
    const ratio = p.originalRatio || 1;
    let finalW, finalH;

    if (ratio >= 1) {
      // Foto apaisada / horizontal: caja maxDim x minDim
      finalW = maxDim;
      finalH = maxDim / ratio;
      if (finalH > minDim) {
        finalH = minDim;
        finalW = minDim * ratio;
      }
    } else {
      // Foto vertical: caja minDim x maxDim
      finalH = maxDim;
      finalW = maxDim * ratio;
      if (finalW > minDim) {
        finalW = minDim;
        finalH = minDim / ratio;
      }
    }

    return {
      ...p,
      widthCM: (Math.round(finalW * 10) / 10).toFixed(1),
      heightCM: (Math.round(finalH * 10) / 10).toFixed(1),
      isRatioLocked: true,
      rotation: 0,
    };
  });
}

/**
 * Carga una imagen desde una URL y devuelve un HTMLImageElement resuelto
 */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.crossOrigin = 'anonymous';
    img.src = url;
  });
}

/**
 * Convierte HTMLImageElement a base64 data URL via canvas, con recorte centrado
 * y rotación para respetar el tamaño de destino sin deformar.
 */
export function imageToDataURL(img, targetW, targetH, rotation = 0) {
  const canvas = document.createElement('canvas');
  // Resolución alta: 300 DPI equivalente (~11.81 px por mm)
  const PX_PER_MM = 11.81;
  const destPxW = Math.round(targetW * PX_PER_MM);
  const destPxH = Math.round(targetH * PX_PER_MM);

  canvas.width = destPxW;
  canvas.height = destPxH;
  const ctx = canvas.getContext('2d');

  ctx.save();
  ctx.translate(destPxW / 2, destPxH / 2);
  const rad = (rotation * Math.PI) / 180;
  ctx.rotate(rad);

  const isPerpendicular = rotation === 90 || rotation === 270;
  const boxW = isPerpendicular ? destPxH : destPxW;
  const boxH = isPerpendicular ? destPxW : destPxH;

  // Recorte centrado (object-fit: cover)
  const srcRatio = img.naturalWidth / img.naturalHeight;
  const destRatio = boxW / boxH;

  let sx, sy, sw, sh;
  if (srcRatio > destRatio) {
    sh = img.naturalHeight;
    sw = Math.round(sh * destRatio);
    sx = Math.round((img.naturalWidth - sw) / 2);
    sy = 0;
  } else {
    sw = img.naturalWidth;
    sh = Math.round(sw / destRatio);
    sx = 0;
    sy = Math.round((img.naturalHeight - sh) / 2);
  }

  ctx.drawImage(img, sx, sy, sw, sh, -boxW / 2, -boxH / 2, boxW, boxH);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.95);
}

/**
 * Genera el PDF final y lo descarga.
 * @param {Array} photos - Array de fotos
 * @param {string} paperKey - 'A4' | 'Carta'
 * @param {Object} [customLayout] - Opcional: layout ya calculado para coincidir exactamente con la vista previa
 */
export async function generatePDF(photos, paperKey = 'A4', customLayout = null) {
  const { pages, paper } = customLayout || layoutPhotos(photos, paperKey);

  const validPages = pages.filter(p => p.length > 0);
  if (validPages.length === 0) {
    throw new Error('No hay fotos colocadas para generar el PDF.');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paper.width, paper.height],
  });

  for (let pageIdx = 0; pageIdx < validPages.length; pageIdx++) {
    if (pageIdx > 0) {
      pdf.addPage([paper.width, paper.height], 'portrait');
    }

    const items = validPages[pageIdx];

    for (const item of items) {
      const img = await loadImage(item.photo.url);
      const rot = item.photo.rotation || 0;
      const dataURL = imageToDataURL(img, item.w, item.h, rot);
      pdf.addImage(dataURL, 'JPEG', item.x, item.y, item.w, item.h, undefined, 'FAST');
    }
  }

  pdf.save('fotos-para-imprimir.pdf');
  return validPages.length;
}
