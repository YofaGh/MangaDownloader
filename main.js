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
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      nodeIntegrationInWorker: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });
  mainWindow.setResizable(false);
  mainWindow.loadFile("mui/build/index.html");
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

const saveFile = (name, data) => {
  if (!fs.existsSync(path.join(app.getPath("userData"), name))) {
    fs.writeFileSync(
      path.join(app.getPath("userData"), name),
      JSON.stringify(data, null, 2),
      "utf8"
    );
  }
};

const loadUpChecks = () => {
  saveFile("settings.json", defaultSettings);
  saveFile("queue.json", []);
  saveFile("downloaded.json", []);
  saveFile("favorites.json", []);
  saveFile("library.json", {});
};

app.whenReady().then(() => {
  app.on("window-all-closed", () => {
    app.quit();
  });
  loadUpChecks();
  createWindow();
});
