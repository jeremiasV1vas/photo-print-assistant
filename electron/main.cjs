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

ipcMain.handle('analyze-image', async (event, imagePath, targetSize) => {
  try {
    const apiKey = process.env.AI_API_KEY;
    if (!apiKey || apiKey === 'your_key_here') {
      return { success: false, error: "Falta configurar tu AI_API_KEY en el archivo .env." };
    }

    const { GoogleGenAI } = require('@google/genai');
    const ai = new GoogleGenAI({ apiKey });

    // Leer la imagen en Base64
    const imageBase64 = fs.readFileSync(imagePath).toString('base64');
    const mimeType = imagePath.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    
    const prompt = `Analiza esta fotografía para impresión. El tamaño objetivo solicitado es ${targetSize} cm. 
Dime si la orientación de la foto original (horizontal/vertical) coincide bien con el tamaño objetivo o si sugieres rotar la foto para evitar cortes importantes. 
Indica brevemente en un lenguaje super amigable si alguna cara o elemento principal se cortaría.
Devuelve tu respuesta en formato JSON estrictamente válido, sin texto extra fuera de las llaves, con esta estructura:
{
  "suggestedRotation": 0, 
  "analysis": "Breve mensaje explicando qué pasa con el encuadre (máximo 2 oraciones breves)."
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                data: imageBase64,
                mimeType
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const resultText = response.text;
    const jsonResult = JSON.parse(resultText);

    return {
      success: true,
      message: jsonResult.analysis,
      suggestedRotation: jsonResult.suggestedRotation,
    };
  } catch (error) {
    return { success: false, error: `Error de IA: ${error.message}` };
  }
});
