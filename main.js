const { app, BrowserWindow, ipcMain, shell, dialog } = require("electron");
const { execFile } = require("child_process");
const https = require("https");
const path = require("path");
const fs = require("fs");
const cheerio = require("cheerio");
const axios = require("axios");

const defaultSettings = {
  autoMerge: false,
  autoConvert: false,
  loadCovers: true,
  sleepTime: 0.1,
  defaultSearchDepth: 3,
  mergeMethod: "Normal",
  downloadPath: null,
  shellerPath: null,
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
  loadingWindow.loadFile("mui/build/splash.html");
  axios
    .get(
      "https://github.com/YofaGh/MangaDownloader/releases/expanded_assets/latest"
    )
    .then((response) => {
      const html = response.data;
      const $ = cheerio.load(html);
      const href = $("a")
        .filter((i, el) => {
          return el.attribs.href && el.attribs.href.includes("sheller");
        })
        .attr("href");
      const shellerLatest = `https://github.com${href}`;
      const fileName = shellerLatest.split("/").pop();
      const exePath = path.join(app.getPath("userData"), fileName);

      const fileContent = fs.readFileSync(
        path.join(app.getPath("userData"), "settings.json"),
        "utf8"
      );
      const settings = JSON.parse(fileContent);
      if (!settings.shellerPath) {
        loadingWindow.webContents.send("update-status", "Downloading Bots...");
        const file = fs.createWriteStream(exePath);
        https.get(shellerLatest, (response) => {
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
                    settings.shellerPath = exePath;
                    fs.writeFileSync(
                      path.join(app.getPath("userData"), "settings.json"),
                      JSON.stringify(settings, null, 2),
                      "utf8"
                    );
                    execFile(exePath);
                    createWindow();
                  });
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
      } else if (settings.shellerPath !== exePath) {
        loadingWindow.webContents.send("update-status", "Updating Bots...");
        const file = fs.createWriteStream(exePath);
        https.get(shellerLatest, (response) => {
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
                    fs.unlinkSync(settings.shellerPath);
                    settings.shellerPath = exePath;
                    fs.writeFileSync(
                      path.join(app.getPath("userData"), "settings.json"),
                      JSON.stringify(settings, null, 2),
                      "utf8"
                    );
                    execFile(exePath);
                    createWindow();
                  });
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
        createWindow();
      }
    });
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
  loadUpChecks();
  createLoadingWindow();
});
