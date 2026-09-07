const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

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
