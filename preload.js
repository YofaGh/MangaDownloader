const { contextBridge, ipcRenderer } = require("electron");
const fs = require("fs");

contextBridge.exposeInMainWorld("do", {
  closeApp: () => {
    ipcRenderer.send("closeApp");
  },
  minimizeApp: () => {
    ipcRenderer.send("minimizeApp");
  },
  getJsonFile: (path) => {
    const fileContent = fs.readFileSync(path, "utf8");
    return JSON.parse(fileContent);
  },
  setJsonFile: (path, data) => {
    fs.writeFileSync(path, JSON.stringify(data));
  },
});
