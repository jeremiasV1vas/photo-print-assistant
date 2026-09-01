const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Cargar variables de entorno desde .env si existe
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
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

ipcMain.handle('analyze-image', async (event, imageBase64, mimeType, targetSize) => {
  try {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey || apiKey === 'your_key_here') {
      return { success: false, error: "Falta configurar tu AI_API_KEY en el archivo .env." };
    }

    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    const prompt = `Analiza esta fotografía para impresión en tamaño ${targetSize} cm.
Respondé en formato JSON con esta estructura exacta (sin texto extra):
{"suggestedRotation": 0, "analysis": "Tu análisis breve y amigable aquí (máximo 2 oraciones)."}

En "analysis" indicá si la orientación de la foto es adecuada para ese tamaño, o si hay riesgo de cortar algo importante como caras.`;

    // Lista de modelos a intentar en orden
    const models = ['gemini-2.0-flash', 'gemini-1.5-flash-latest', 'gemini-pro-vision'];
    let lastError = null;

    for (const model of models) {
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

        // Extraer JSON aunque venga envuelto en bloques de código markdown
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('Respuesta sin JSON válido');
        const jsonResult = JSON.parse(jsonMatch[0]);

        return {
          success: true,
          message: jsonResult.analysis || 'Análisis completado.',
          suggestedRotation: jsonResult.suggestedRotation ?? 0,
        };
      } catch (err) {
        lastError = err;
        // Si es 404 (modelo no disponible) intentamos el siguiente
        if (!err.message.includes('not found') && !err.message.includes('NOT_FOUND')) {
          break; // Si es otro tipo de error, no seguimos intentando
        }
      }
    }

    return { success: false, error: `Error de IA: ${lastError?.message}` };
  } catch (error) {
    return { success: false, error: `Error de IA: ${error.message}` };
  }
});
