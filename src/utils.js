import { invoke } from "@tauri-apps/api/core";
import { listen, once } from "@tauri-apps/api/event";
import {
  readTextFile,
  writeTextFile,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";
import {
  useNotificationStore,
  useSettingsStore,
  useDownloadedStore,
  useLibraryStore,
  useQueueStore,
  useDownloadingStore,
  useFavoritesStore,
  useModulesStore,
} from "./store";

export const fixFolderName = (manga) =>
  manga.replace(/[/:*?"><|]+/g, "").replace(/\.*$/, "");

export const convert = async (webtoon, openPath) => {
  let pdfName = fixFolderName(webtoon.title);
  let notifInfo = webtoon.title;
  if (webtoon.type === "manga") {
    pdfName += `_${webtoon.info}`;
    notifInfo += ` - ${webtoon.info}`;
  } else pdfName = `${webtoon.doujin}_${pdfName}.pdf`;
  await invoke("convert", { path: webtoon.path, pdfName });
  useNotificationStore
    .getState()
    .addSuccessNotification(`Converted ${notifInfo} to PDF`);
  if (openPath)
    await invoke("open_folder", { path: `${webtoon.path}\\${pdfName}` });
};

export const merge = async (webtoon, openPath) => {
  const { download_path, merge_method } = useSettingsStore.getState().settings;
  let path = `${download_path}\\Merged\\${fixFolderName(webtoon.title)}`;
  let notifInfo = webtoon.title;
  if (webtoon.type === "manga") {
    path += `\\${webtoon.info}`;
    notifInfo += ` - ${webtoon.info}`;
  }
  await invoke("merge", {
    pathToSource: webtoon.path,
    pathToDestination: path,
    mergeMethod: merge_method,
  });
  useNotificationStore.getState().addSuccessNotification(`Merged ${notifInfo}`);
  if (openPath) await invoke("open_folder", { path });
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

export const retrieveImage = async (url, domain, setImageSrc, defImage) => {
  try {
    const response = await invoke("retrieve_image", { domain, url });
    setImageSrc(response);
  } catch (_) {
    setImageSrc(defImage || "./assets/default-cover.svg");
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

export const startDownloading = async () => {
  const settings = useSettingsStore.getState().settings;
  if (!settings) return;
  const { downloading, setDownloading, clearDownloading } =
    useDownloadingStore.getState();
  const { queue, removeFromQueue, updateItemInQueue } =
    useQueueStore.getState();
  if (downloading) return;
  const webtoon = queue.find((item) => item.status === "Started");
  if (!webtoon) return;
  setDownloading(webtoon);
  let fixedTitle = fixFolderName(webtoon.title);
  if (webtoon.type === "manga") fixedTitle += `\\${webtoon.info}`;
  invoke("download", {
    webtoonId: webtoon.id,
    module: webtoon.module,
    webtoon: webtoon.manga || webtoon.doujin,
    chapter: webtoon.chapter || "",
    fixedTitle,
    sleepTime: settings.sleep_time,
    downloadPath: settings.download_path,
  });
  await once("totalImages", (event) =>
    updateItemInQueue(event.payload.webtoon_id, {
      total: event.payload.total_images,
    })
  );
  await listen("downloading", (event) =>
    updateItemInQueue(event.payload.webtoon_id, {
      image: event.payload.image,
    })
  );
  await once("doneDownloading", (event) => {
    let webt = queue.find((item) => item.id === event.payload.webtoon_id);
    if (webt.inLibrary) {
      useLibraryStore
        .getState()
        .updateItemInLibrary(`${webt.module}_$_${webt.manga}`, {
          last_downloaded_chapter: {
            name: webt.info,
            url: webt.chapter,
          },
        });
    }
    let inf;
    let notifInfo = webt.title;
    if (webt.type === "manga") {
      inf = { manga: webt.manga, chapter: webt.chapter };
      notifInfo += ` - ${webt.info}`;
    } else {
      inf = { doujin: webt.doujin };
    }
    useDownloadedStore.getState().addToDownloaded({
      path: event.payload.download_path,
      images: event.payload.total,
      title: webt.title,
      info: webt.info,
      module: webt.module,
      type: webt.type,
      id: webt.id,
      ...inf,
    });
    useNotificationStore
      .getState()
      .addSuccessNotification(`Downloaded ${notifInfo}`);
    if (settings.auto_merge) merge(webt, false);
    if (settings.auto_convert) convert(webt, false);
    removeFromQueue(event.payload.webtoon_id);
    clearDownloading();
  });
};

export const writeFile = async (fileName, data) => {
  if (fileName === "library.json") {
    data = data.reduce((acc, { title, ...details }) => {
      acc[title] = details;
      return acc;
    }, {});
  }
  await writeTextFile(
    fileName,
    JSON.stringify(data, null, 2),
    { baseDir: BaseDirectory.AppData },
    "utf8"
  );
};

export const startUp = async () => {
  const datas = {
    "settings.json": useSettingsStore.getState().updateSettings,
    "queue.json": useQueueStore.getState().setQueue,
    "downloaded.json": useDownloadedStore.getState().setDownloaded,
    "favorites.json": useFavoritesStore.getState().setFavorites,
    "library.json": useLibraryStore.getState().setLibrary,
  };
  await Promise.all(
    Object.entries(datas).map(async ([file, setter]) => {
      const contents = await readTextFile(
        file,
        { baseDir: BaseDirectory.AppData },
        "utf8"
      );
      let data = JSON.parse(contents);
      if (file === "queue.json") {
        data = data.map((item) => ({
          ...item,
          status: item.status === "Started" ? "Paused" : item.status,
        }));
      } else if (file === "library.json") {
        data = Object.entries(data).map(([title, details]) => ({
          title,
          ...details,
        }));
      }
      setter(data);
    })
  );
  (async () => {
    const response = await invoke("get_modules");
    useModulesStore
      .getState()
      .setModules(response.map((module) => ({ ...module, selected: true })));
  })();
};
