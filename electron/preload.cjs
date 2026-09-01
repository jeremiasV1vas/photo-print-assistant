const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  listModels: () => ipcRenderer.invoke('list-models'),
  analyzeImage: (imageBase64, mimeType, targetSize) =>
    ipcRenderer.invoke('analyze-image', imageBase64, mimeType, targetSize)
});
