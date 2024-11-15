import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrent } from "@tauri-apps/api/window";
import {
  remove,
  readTextFile,
  writeTextFile,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";

export const getAppWindow = () => getCurrent();

export const chooseFile = async () => await open();

export const removeFile = async (path) => await remove(path);

export const _invoke = async (fn, args) => await invoke(fn, args);

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
