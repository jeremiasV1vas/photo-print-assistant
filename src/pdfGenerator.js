import { jsPDF } from 'jspdf';

// Tamaños de papel en mm
const PAPER_SIZES = {
  A4: { width: 210, height: 297 },
  Carta: { width: 216, height: 279 },
};

// Margen de la hoja en mm
const MARGIN = 5;

/**
 * Dado el string de tamaño "AxB" o un custom, devuelve { w, h } en mm
 */
function parseSizeMM(photo) {
  if (photo.size === 'custom') {
    return {
      w: parseFloat(photo.customWidth) * 10,
      h: parseFloat(photo.customHeight) * 10,
    };
  }
  const [w, h] = photo.size.split('x').map(n => parseFloat(n) * 10);
  return { w, h };
}

/**
 * Algoritmo de empaquetado simple (bin-packing greedy por filas).
 * Devuelve un array de páginas, cada una con array de { photo, x, y, w, h }
 */
function layoutPhotos(photos, paperKey) {
  const paper = PAPER_SIZES[paperKey] || PAPER_SIZES.A4;
  const usableW = paper.width - MARGIN * 2;
  const usableH = paper.height - MARGIN * 2;

  const pages = [];
  let currentPage = [];
  let cursorX = MARGIN;
  let cursorY = MARGIN;
  let rowHeight = 0;

  for (const photo of photos) {
    const { w, h } = parseSizeMM(photo);

    // Si la foto no cabe ni en una fila vacía, la escalamos para que quepa
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
    if (cursorX + fw > paper.width - MARGIN) {
      // Saltar a nueva fila
      cursorX = MARGIN;
      cursorY += rowHeight + MARGIN;
      rowHeight = 0;
    }

    // ¿Cabe en la página actual?
    if (cursorY + fh > paper.height - MARGIN) {
      // Nueva página
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

  return { pages, paper };
}

/**
 * Carga una imagen desde una URL y devuelve un HTMLImageElement resuelto
 */
function loadImage(url) {
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
 * para respetar el tamaño de destino sin deformar.
 */
function imageToDataURL(img, targetW, targetH) {
  const canvas = document.createElement('canvas');
  // Resolución alta: 300 DPI equivalente (1mm = ~11.81px a 300dpi)
  const PX_PER_MM = 11.81;
  const destPxW = Math.round(targetW * PX_PER_MM);
  const destPxH = Math.round(targetH * PX_PER_MM);

  canvas.width = destPxW;
  canvas.height = destPxH;
  const ctx = canvas.getContext('2d');

  // Recorte centrado (object-fit: cover)
  const srcRatio = img.naturalWidth / img.naturalHeight;
  const destRatio = destPxW / destPxH;

  let sx, sy, sw, sh;
  if (srcRatio > destRatio) {
    // La imagen es más ancha → recortamos los costados
    sh = img.naturalHeight;
    sw = Math.round(sh * destRatio);
    sx = Math.round((img.naturalWidth - sw) / 2);
    sy = 0;
  } else {
    // La imagen es más alta → recortamos arriba y abajo
    sw = img.naturalWidth;
    sh = Math.round(sw / destRatio);
    sx = 0;
    sy = Math.round((img.naturalHeight - sh) / 2);
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, destPxW, destPxH);
  return canvas.toDataURL('image/jpeg', 0.92);
}

/**
 * Genera el PDF final y lo descarga.
 * @param {Array} photos - Array de objetos de foto con size, url, etc.
 * @param {string} paperKey - 'A4' | 'Carta'
 */
export async function generatePDF(photos, paperKey = 'A4') {
  const { pages, paper } = layoutPhotos(photos, paperKey);

  if (pages.length === 0) {
    throw new Error('No hay fotos para generar el PDF.');
  }

  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [paper.width, paper.height],
  });

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    if (pageIdx > 0) {
      pdf.addPage([paper.width, paper.height], 'portrait');
    }

    const items = pages[pageIdx];

    for (const item of items) {
      const img = await loadImage(item.photo.url);
      const dataURL = imageToDataURL(img, item.w, item.h);
      pdf.addImage(dataURL, 'JPEG', item.x, item.y, item.w, item.h, undefined, 'FAST');
    }
  }

  pdf.save('fotos-para-imprimir.pdf');
  return pages.length;
}
