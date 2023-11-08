const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const { execFile } = require("child_process");
const https = require("https");
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
  cliPath: null,
};

function createLoadingWindow() {
  const loadingWindow = new BrowserWindow({
    width: 400,
    height: 200,
    frame: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: true,
      nodeIntegrationInWorker: true,
      preload: path.join(__dirname, "renderer.js"),
    },
  });
  loadingWindow.setResizable(false);
  loadingWindow.loadFile("mui/public/splash.html");

  const fileContent = fs.readFileSync(
    path.join(app.getPath("userData"), "settings.json"),
    "utf8"
  );
  const settings = JSON.parse(fileContent);
  const exePath = path.join(app.getPath("userData"), "cli-latest.exe");
  if (!settings.cliPath) {
    const fileUrl =
      "https://github.com/YofaGh/MangaDownloader/releases/download/v1.0.0/cli-v1.0.0.exe";
    const file = fs.createWriteStream(exePath);
    https.get(fileUrl, (response) => {
      https
        .get(
          response.headers.location,
          { followRedirects: true },
          (response) => {
            response.pipe(file);
            file.on("finish", () => {
              file.close();
              file.once("close", () => {
                loadingWindow.close();
                settings.cliPath = exePath;
                fs.writeFileSync(
                  path.join(app.getPath("userData"), "settings.json"),
                  JSON.stringify(settings, null, 2),
                  "utf8"
                );
                execFile(exePath);
                createWindow();
              })
            });
            const totalSize = response.headers["content-length"];
            let downloadedSize = 0;
            response.on("data", (chunk) => {
              downloadedSize += chunk.length;
              const progress = (downloadedSize / totalSize) * 100;
              loadingWindow.webContents.send("download-progress", progress);
            });
          }
        )
        .on("error", () => loadingWindow.close());
    });
  } else {
    loadingWindow.close();
    execFile(settings.cliPath);
    createWindow();
  }
}

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
  // mainWindow.loadURL("http://127.0.0.1:3000");
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
    fetch("http://127.0.0.1:8000/shutdown/").then((res) => {
      console.log(res);
      app.quit();
    });
  });
  loadUpChecks();
  createLoadingWindow();
});
