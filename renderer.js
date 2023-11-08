const { ipcRenderer } = require("electron");

ipcRenderer.on("download-progress", (event, progress) => {
  const downloadProgress = document.getElementById("downloadProgress");
  downloadProgress.value = progress;
});
