const { ipcRenderer } = require("electron");

ipcRenderer.on("update-status", (event, status) => {
  const h3 = document.getElementById("splash-status");
  h3.innerHTML = status;
});

ipcRenderer.on("download-progress", (event, progress) => {
  const downloadProgress = document.getElementById("downloadProgress");
  downloadProgress.value = progress;
});
