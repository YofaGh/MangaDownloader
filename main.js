const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const path = require("path");
const fs = require("fs");

const defaultSettings = {
  autoMerge: false,
  autoConvert: false,
  loadCovers: true,
  sleepTime: 0.1,
  defaultSearchDepth: 3,
  mergeMethod: "Normal",
  downloadPath: null,
};

function createWindow() {
  const mainWindow = new BrowserWindow({
    title: "Manga Downloader",
    width: 1000,
    height: 600,
    //frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      nodeIntegrationInWorker: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.setResizable(false);
  //mainWindow.loadFile("mui/build/index.html");
  mainWindow.loadURL("http://127.0.0.1:3000");
  mainWindow.webContents.setWindowOpenHandler((req) => {
    shell.openExternal(req.url);
    return { action: "deny" };
  });
  ipcMain.on("closeApp", () => {
    mainWindow.close();
  });
  ipcMain.on("minimizeApp", () => {
    mainWindow.minimize();
  });
  ipcMain.handle("selectFolder", async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
      properties: ["openDirectory"],
    });
    if (canceled) {
      return;
    } else {
      return filePaths[0];
    }
  });
  ipcMain.handle("getSettingsPath", async () => {
    return app.getPath("userData");
  });
}

const loadUpChecks = () => {
  if (!fs.existsSync(path.join(app.getPath("userData"), "settings.json"))) {
    fs.writeFileSync(
      path.join(app.getPath("userData"), "settings.json"),
      JSON.stringify(defaultSettings, null, 2),
      "utf8"
    );
  }
  if (!fs.existsSync(path.join(app.getPath("userData"), "queue.json"))) {
    fs.writeFileSync(
      path.join(app.getPath("userData"), "queue.json"),
      JSON.stringify([], null, 2),
      "utf8"
    );
  }
  if (!fs.existsSync(path.join(app.getPath("userData"), "downloaded.json"))) {
    fs.writeFileSync(
      path.join(app.getPath("userData"), "downloaded.json"),
      JSON.stringify([], null, 2),
      "utf8"
    );
  }
  if (!fs.existsSync(path.join(app.getPath("userData"), "favorites.json"))) {
    fs.writeFileSync(
      path.join(app.getPath("userData"), "favorites.json"),
      JSON.stringify([], null, 2),
      "utf8"
    );
  }
  if (!fs.existsSync(path.join(app.getPath("userData"), "library.json"))) {
    fs.writeFileSync(
      path.join(app.getPath("userData"), "library.json"),
      JSON.stringify({}, null, 2),
      "utf8"
    );
  }
};
app.whenReady().then(() => {
  loadUpChecks();
  createWindow();
});
