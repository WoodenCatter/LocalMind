const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("localmind", {
  appName: "LocalMind",
  selectImportFiles: () => ipcRenderer.invoke("localmind:select-import-files")
});
