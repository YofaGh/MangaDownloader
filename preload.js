const { contextBridge, ipcRenderer, shell } = require("electron");
const path = require("path");
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
  showItemInFolder: (path) => {
    shell.showItemInFolder(path);
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
  removeFolderIfEmpty: (path) => {
    try {
      fs.rmdirSync(path);
    } catch (err) {}
  },
  getJsonFile: (pathToFile, name) => {
    const fileContent = fs.readFileSync(path.join(pathToFile, name), "utf8");
    return JSON.parse(fileContent);
  },
  setJsonFile: (pathToFile, name, data) => {
    fs.writeFileSync(path.join(pathToFile, name), JSON.stringify(data, null, 2), "utf8");
  },
  selectFolder: () => ipcRenderer.invoke("selectFolder"),
  getSettingsPath: () => ipcRenderer.invoke("getSettingsPath"),
  deleteImage: (path) => {
    fs.unlinkSync(path);
  }
});
