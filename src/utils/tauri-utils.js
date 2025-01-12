import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import {
  remove,
  readTextFile,
  writeTextFile,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";
import { openUrl as tauriOpenUrl } from "@tauri-apps/plugin-opener";
import { join, appDataDir } from "@tauri-apps/api/path"; 

export const getAppWindow = () => getCurrentWindow();

export const chooseFile = async () => await open();

export const getDataDirPath = async () => await appDataDir();

export const removeFile = async (path) => await remove(path);

export const joinPath = async (...paths) => await join(...paths);

export const openUrl = async (url) => await tauriOpenUrl(url);

export const invoke = async (fn, args) => await tauriInvoke(fn, args);

export const chooseFolder = async () => await open({ directory: true });

export const readFile = async (path) =>
  JSON.parse(
    await readTextFile(path, { baseDir: BaseDirectory.AppData }, "utf8")
  );

export const writeFile = async (path, data) =>
  await writeTextFile(
    path,
    JSON.stringify(data, null, 2),
    { baseDir: BaseDirectory.AppData },
    "utf8"
  );
