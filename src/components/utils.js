import { invoke } from "@tauri-apps/api/core";
import { useNotificationStore, useSettingsStore } from "../store";

export const fixNameForFolder = (manga) => {
  return manga.replace(/[/:*?"><|]+/g, "").replace(/\.*$/, "");
};

export const convert = async (webtoon, openPath) => {
  let pdfName =
    webtoon.type === "manga"
      ? `${fixNameForFolder(webtoon.title)}_${webtoon.info}.pdf`
      : `${webtoon.doujin}_${fixNameForFolder(webtoon.title)}.pdf`;
  await invoke("convert", { path: webtoon.path, pdfName });
  useNotificationStore
    .getState()
    .addSuccessNotification(
      webtoon.type === "manga"
        ? `Converted ${webtoon.title} - ${webtoon.info}`
        : `Converted ${webtoon.title}`
    );
  if (openPath) {
    await invoke("open_folder", { path: `${webtoon.path}\\${pdfName}` });
  }
};

export const merge = async (webtoon, openPath) => {
  const { download_path, merge_method } = useSettingsStore.getState().settings;
  const mergePath =
    webtoon.type === "manga"
      ? download_path +
        "\\Merged\\" +
        fixNameForFolder(webtoon.title) +
        "\\" +
        webtoon.info
      : download_path + "\\Merged\\" + fixNameForFolder(webtoon.title);
  await invoke("merge", {
    pathToSource: webtoon.path,
    pathToDestination: mergePath,
    mergeMethod: merge_method,
  });
  useNotificationStore
    .getState()
    .addSuccessNotification(
      webtoon.type === "manga"
        ? `Merged ${webtoon.title} - ${webtoon.info}`
        : `Merged ${webtoon.title}`
    );
  if (openPath) {
    await invoke("open_folder", { path: mergePath });
  }
};

export const getDate = (datetime) => {
  const date = new Date(datetime);
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
};

export const getDateTime = (datetime) => {
  const date = new Date(datetime);
  return `${date.getFullYear()}/${
    date.getMonth() + 1
  }/${date.getDate()} ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
};

export const retrieveImage = async (
  imageSrc,
  module,
  setImageSrc,
  invoke,
  defImage
) => {
  try {
    const response = await invoke("retrieve_image", {
      domain: module,
      url: imageSrc,
    });
    setImageSrc(response);
  } catch (error) {
    setImageSrc(defImage);
  }
};

export const chunkArray = (array, size) =>
  Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
    array.slice(i * size, i * size + size)
  );

export const isUrlValid = (url) => {
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === "http:" || newUrl.protocol === "https:";
  } catch (_) {
    return false;
  }
};
