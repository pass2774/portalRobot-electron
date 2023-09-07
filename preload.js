const { contextBridge, ipcRenderer } = require('electron');
const dvName = null;
contextBridge.exposeInMainWorld('versions', {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
  ping: () => ipcRenderer.invoke('ping'),
  // we can also expose variables, not just functions
});

// // ❌ Bad code
// contextBridge.exposeInMainWorld('myAPI', {
//   send: ipcRenderer.send
// })

// ✅ Good code
// contextBridge.exposeInMainWorld('myAPI', {
//   loadPreferences: () => ipcRenderer.invoke('load-prefs'),
// });

contextBridge.exposeInMainWorld("portal_electron_API", {
  initSetting: (callback) => ipcRenderer.on('initSetting', callback),
  moduleProfile: (callback) => ipcRenderer.on('moduleProfile', callback),
})
