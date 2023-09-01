const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("do", {
  closeApp: () => {
    ipcRenderer.send("closeApp");
  },
  minimizeApp: () => {
    ipcRenderer.send("minimizeApp");
  },
});
