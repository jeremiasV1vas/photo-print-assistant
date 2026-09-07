const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno desde .env si existe
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch {
  // Ignorar en producción si dotenv no está disponible o el archivo no existe
}

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Photo Print Assistant',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  mainWindow.maximize();

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    // mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// --- IPC Handlers ---

ipcMain.handle('ping', () => {
  return 'pong from electron main process!';
});

// Consulta la API y devuelve los modelos disponibles para la clave configurada
ipcMain.handle('list-models', async () => {
  try {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey || apiKey === 'your_key_here') {
      return { success: false, error: 'Falta la API key en .env' };
    }
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) return { success: false, error: JSON.stringify(data) };
    const names = (data.models || []).map(m => m.name.replace('models/', ''));
    return { success: true, models: names };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('analyze-image', async (event, imageBase64, mimeType, targetSize) => {
  try {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey || apiKey === 'your_key_here') {
      return { success: false, error: "Falta configurar tu AI_API_KEY en el archivo .env." };
    }

    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    // Modelos modernos disponibles en orden de prioridad y estabilidad
    const candidateModels = [
      'gemini-flash-latest',
      'gemini-3.5-flash',
      'gemini-3.6-flash',
      'gemini-3.7-flash',
      'gemini-3.1-flash-lite',
      'gemini-2.5-pro',
    ];

    const prompt = `Analiza esta fotografía para impresión en tamaño ${targetSize} cm.
Respondé en formato JSON con esta estructura exacta (sin texto extra):
{"suggestedRotation": 0, "analysis": "Tu análisis breve y amigable aquí (máximo 2 oraciones)."}
En "analysis" indicá si la orientación es adecuada o si hay riesgo de cortar algo importante al encuadrar en ${targetSize} cm.`;

    let lastError = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: [{
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { data: imageBase64, mimeType } }
            ]
          }]
        });

        const text = response.text.trim();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Respuesta sin JSON válido');
        const jsonResult = JSON.parse(jsonMatch[0]);

        return {
          success: true,
          message: jsonResult.analysis || 'Análisis completado.',
          suggestedRotation: jsonResult.suggestedRotation ?? 0,
          modelUsed: model,
        };
      } catch (err) {
        lastError = err;
        // Si falló este modelo (por ej. deprecado o saturado temporalmente), probamos el siguiente
        continue;
      }
    }

    throw lastError || new Error('No se pudo conectar con ningún modelo de IA disponible.');
  } catch (error) {
    return { success: false, error: `Error de IA: ${error.message}` };
  }
});

// Consulta y devuelve la lista de impresoras disponibles en el sistema operativo
ipcMain.handle('get-printers', async () => {
  try {
    const win = mainWindow && !mainWindow.isDestroyed() ? mainWindow : new BrowserWindow({ show: false });
    const printers = await win.webContents.getPrintersAsync();
    if (win !== mainWindow && !win.isDestroyed()) {
      win.destroy();
    }
    return { success: true, printers };
  } catch (err) {
    return { success: false, error: err.message, printers: [] };
  }
});

// Imprime las páginas directamente en la impresora
ipcMain.handle('print-pages', async (event, { pages, paper, deviceName, silent = false }) => {
  if (!pages || pages.length === 0) {
    return { success: false, error: 'No hay páginas para imprimir' };
  }

  const paperWidth = paper?.width || 210;
  const paperHeight = paper?.height || 297;

  // Generamos un documento HTML con dimensiones exactas en milímetros y saltos de página limpios
  const htmlContent = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Imprimir Fotos - Photo Print Assistant</title>
  <style>
    @page {
      size: ${paperWidth}mm ${paperHeight}mm;
      margin: 0;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    html, body {
      width: ${paperWidth}mm;
      margin: 0;
      padding: 0;
      background: #ffffff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .sheet-page {
      width: ${paperWidth}mm;
      height: ${paperHeight}mm;
      position: relative;
      page-break-after: always;
      break-after: page;
      overflow: hidden;
      background: #ffffff;
    }
    .sheet-page:last-child {
      page-break-after: avoid;
      break-after: avoid;
    }
    .photo-item {
      position: absolute;
      display: block;
      overflow: hidden;
    }
    .photo-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
  </style>
</head>
<body>
  ${pages
    .map(
      (items, pageIdx) => `
    <div class="sheet-page" data-page="${pageIdx + 1}">
      ${items
        .map(
          item => `
        <div class="photo-item" style="left: ${item.x}mm; top: ${item.y}mm; width: ${item.w}mm; height: ${item.h}mm;">
          <img src="${item.dataUrl}" />
        </div>
      `
        )
        .join('')}
    </div>
  `
    )
    .join('')}
</body>
</html>`;

  const tempFilePath = path.join(
    app.getPath('temp'),
    `print_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.html`
  );

  let printWin = null;
  try {
    fs.writeFileSync(tempFilePath, htmlContent, 'utf-8');

    printWin = new BrowserWindow({
      show: false,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
      },
    });

    await printWin.loadFile(tempFilePath);

    const printOptions = {
      silent: Boolean(silent),
      printBackground: true,
      margins: { marginType: 'none' },
      pageSize: {
        width: Math.round(paperWidth * 1000), // microns
        height: Math.round(paperHeight * 1000), // microns
      },
    };

    if (deviceName) {
      printOptions.deviceName = deviceName;
    }

    const availablePrinters = await printWin.webContents.getPrintersAsync();
    if (!availablePrinters || availablePrinters.length === 0) {
      if (fs.existsSync(tempFilePath)) {
        try { fs.unlinkSync(tempFilePath); } catch {}
      }
      if (printWin && !printWin.isDestroyed()) {
        try { printWin.destroy(); } catch {}
      }
      return {
        success: false,
        noPrinters: true,
        error: 'No se encontró ninguna impresora instalada en el sistema. Por favor conectá o configurá tu impresora, o utilizá el botón "💾 Descargar PDF".',
      };
    }

    return await new Promise((resolve) => {
      let resolved = false;

      const cleanup = () => {
        if (fs.existsSync(tempFilePath)) {
          try {
            fs.unlinkSync(tempFilePath);
          } catch {
            // Ignorar error al borrar temporal
          }
        }
        if (printWin && !printWin.isDestroyed()) {
          try {
            printWin.destroy();
          } catch {
            // Ignorar error al destruir ventana
          }
        }
      };

      printWin.webContents.print(printOptions, (success, failureReason) => {
        if (resolved) return;
        resolved = true;
        cleanup();

        if (success) {
          resolve({ success: true, pages: pages.length });
        } else {
          let friendlyError = failureReason || 'Error desconocido al imprimir';
          if (failureReason === 'Failed to enumerate printers') {
            friendlyError = 'No se detectaron impresoras activas en el sistema operativo.';
          }
          resolve({
            success: false,
            cancelled: failureReason === 'cancelled',
            error: friendlyError,
          });
        }
      });
    });
  } catch (err) {
    if (fs.existsSync(tempFilePath)) {
      try {
        fs.unlinkSync(tempFilePath);
      } catch {
        // Ignorar
      }
    }
    if (printWin && !printWin.isDestroyed()) {
      try {
        printWin.destroy();
      } catch {
        // Ignorar
      }
    }
    return { success: false, error: err.message };
  }
});
