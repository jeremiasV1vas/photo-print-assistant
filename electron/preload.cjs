const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  ping: () => ipcRenderer.invoke('ping'),
  analyzeImage: (imagePath, targetSize) => ipcRenderer.invoke('analyze-image', imagePath, targetSize)
});
