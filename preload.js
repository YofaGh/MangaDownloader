const { contextBridge, ipcRenderer, shell } = require("electron");
const fs = require("fs");

contextBridge.exposeInMainWorld("do", {
  closeApp: () => {
    ipcRenderer.send("closeApp");
  },
  minimizeApp: () => {
    ipcRenderer.send("minimizeApp");
  },
  openFolder: (path) => {
    shell.openExternal(path);
  },
  createFolder: (path) => {
    fs.mkdirSync(path, { recursive: true }, (err) => {});
  },
  ls: (path) => {
    return fs.readdirSync(path);
  },
  removeFolder: (path) => {
    try {
      fs.rmSync(path, { recursive: true });
    } catch (err) {}
  },
  getJsonFile: (path) => {
    const fileContent = fs.readFileSync(path, "utf8");
    return JSON.parse(fileContent);
  },
  setJsonFile: (path, data) => {
    fs.writeFileSync(path, JSON.stringify(data, null, 2), "utf8");
  },
});
