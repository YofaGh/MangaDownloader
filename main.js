const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
require('electron-reload')(__dirname)

function createWindow() {
  const mainWindow = new BrowserWindow({
    title: "Manga Downloader",
    width: 800,
    height: 600,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.setResizable(false);
  mainWindow.loadFile("mui/build/index.html");
  ipcMain.on("closeApp", () => {
    mainWindow.close();
  });
  ipcMain.on("minimizeApp", () => {
    mainWindow.minimize();
  });
}

app.whenReady().then(createWindow);
