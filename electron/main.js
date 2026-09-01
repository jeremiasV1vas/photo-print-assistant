const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { GoogleGenAI } = require('@google/genai');

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
      preload: path.join(__dirname, 'preload.js'),
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

// Prueba de conexión
ipcMain.handle('ping', () => {
  return 'pong from electron main process!';
});

// Lógica inicial para llamar a Gemini
ipcMain.handle('analyze-image', async (event, imagePath, targetSize) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.AI_API_KEY });
    // Aquí implementaremos la llamada a Gemini para sugerir recortes / rotaciones.
    // Simulación por ahora:
    return {
      success: true,
      message: `Simulando análisis para tamaño ${targetSize}`,
      suggestedRotation: 0,
      crop: { x: 0, y: 0, width: 100, height: 100 }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
