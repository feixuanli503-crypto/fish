const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("fishDesk", {
  minimize: () => ipcRenderer.invoke("window:minimize"),
  hide: () => ipcRenderer.invoke("window:hide"),
  show: () => ipcRenderer.invoke("window:show"),
  quit: () => ipcRenderer.invoke("window:quit"),
  toggleFullScreen: () => ipcRenderer.invoke("window:toggle-full-screen"),
  setOpacity: (opacity) => ipcRenderer.invoke("window:set-opacity", opacity),
  openExternal: (url) => ipcRenderer.invoke("open:external", url),
  updateShortcuts: (shortcuts) => ipcRenderer.invoke("shortcuts:update", shortcuts),
  toggleMini: () => ipcRenderer.invoke("mini:toggle"),
  setMiniMode: (enabled) => ipcRenderer.invoke("mini:set-mode", enabled),
  onMiniModeChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("window:mini-mode-changed", listener);
    return () => ipcRenderer.removeListener("window:mini-mode-changed", listener);
  },
  onWindowStateChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("window:state-changed", listener);
    return () => ipcRenderer.removeListener("window:state-changed", listener);
  },
});
