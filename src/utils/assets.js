import {
  useQueueStore,
  useLibraryStore,
  useModulesStore,
  useSettingsStore,
  useFavoritesStore,
  useDownloadedStore,
  useNotificationStore,
} from "../store";
import {
  _merge,
  _convert,
  readFile,
  getModules,
  openFolder,
  WebtoonType,
  _retrieveImage,
  DownloadStatus,
} from ".";

export const fixFolderName = (manga) =>
  manga.replace(/[/:*?"><|]+/g, "").replace(/\.*$/, "");

export const convert = async (webtoon, openPath) => {
  let pdfName = fixFolderName(webtoon.title);
  let notifInfo = webtoon.title;
  if (webtoon.type === WebtoonType.MANGA) {
    pdfName += `_${webtoon.info}.pdf`;
    notifInfo += ` - ${webtoon.info}`;
  } else pdfName = `${webtoon.doujin}_${pdfName}.pdf`;
  await _convert(webtoon.path, pdfName);
  useNotificationStore
    .getState()
    .addSuccessNotification(`Converted ${notifInfo} to PDF`);
  if (openPath) await openFolder(`${webtoon.path}\\${pdfName}`);
};

export const merge = async (webtoon, openPath) => {
  const { download_path, merge_method } = useSettingsStore.getState().settings;
  let path = `${download_path}\\Merged\\${fixFolderName(webtoon.title)}`;
  let notifInfo = webtoon.title;
  if (webtoon.type === WebtoonType.MANGA) {
    path += `\\${webtoon.info}`;
    notifInfo += ` - ${webtoon.info}`;
  }
  await _merge(webtoon.path, path, merge_method);
  useNotificationStore.getState().addSuccessNotification(`Merged ${notifInfo}`);
  if (openPath) await openFolder(path);
};

export const retrieveImage = async (url, domain, defImage) => {
  if (!domain) return defImage;
  try {
    const response = await _retrieveImage(domain, url);
    if (response) return response;
  } catch (_) {}
  return defImage;
};

export const isUrlValid = (url) => {
  try {
    const newUrl = new URL(url);
    return newUrl.protocol === "http:" || newUrl.protocol === "https:";
  } catch (_) {
    return false;
  }
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
      let data = await readFile(file);
      if (file === "queue.json")
        data = data.map((item) => ({
          ...item,
          status:
            item.status === DownloadStatus.STARTED
              ? DownloadStatus.PAUSED
              : item.status,
        }));
      setter(data);
    })
  );
  (async () => {
    const response = await getModules();
    useModulesStore
      .getState()
      .setModules(response.map((module) => ({ ...module, selected: true })));
  })();
  if (!useSettingsStore.getState().settings.download_path)
    showHideModal("browse-modal", true);
};

export const showHideModal = (id, show) =>
  (document.getElementById(id).style.display = show ? "block" : "none");
