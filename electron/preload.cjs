const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  analyzeImage: (imageBase64, mimeType, targetSize) =>
    ipcRenderer.invoke('analyze-image', imageBase64, mimeType, targetSize)
});
