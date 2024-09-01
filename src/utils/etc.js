import { open } from "@tauri-apps/plugin-dialog";
import { getCurrent } from "@tauri-apps/api/window";
import {
  remove,
  readTextFile,
  writeTextFile,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";

export const chooseFile = async () =>
  await open({ directory: false, multiple: false });

export const chooseFolder = async () => await open({ directory: true });

export const removeFile = async (path) => await remove(path);

export const getAppWindow = () => getCurrent();

export const writeFile = async (path, content) =>
  await writeTextFile(
    path,
    content,
    { baseDir: BaseDirectory.AppData },
    "utf8"
  );

export const readFile = async (path) =>
  await readTextFile(path, { baseDir: BaseDirectory.AppData }, "utf8");

export const DownloadStatus = Object.freeze({
  STARTED: "Started",
  PAUSED: "Paused",
  STOPPED: "Stopped",
});

export const WebtoonType = Object.freeze({
  MANGA: "Manga",
  DOUJIN: "Doujin",
});
