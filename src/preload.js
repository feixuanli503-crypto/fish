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
  onWindowStateChanged: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on("window:state-changed", listener);
    return () => ipcRenderer.removeListener("window:state-changed", listener);
  },
});
