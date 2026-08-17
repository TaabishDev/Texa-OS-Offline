const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('texaDesktop', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  isDesktop: true
});
