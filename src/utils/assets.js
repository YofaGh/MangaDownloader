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
  writeFile,
  DelayTimes,
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
  try {
    await _convert(webtoon.path, pdfName);
    useNotificationStore
      .getState()
      .notifySuccess(`Converted ${notifInfo} to PDF`);
    if (openPath) await openFolder(`${webtoon.path}\\${pdfName}`);
  } catch (error) {
    useNotificationStore
      .getState()
      .notifyError(`Failed to convert: ${Object.values(error)[0]}`);
  }
};

export const merge = async (webtoon, openPath) => {
  const { download_path, merge_method } = useSettingsStore.getState().settings;
  let path = `${download_path}\\Merged\\${fixFolderName(webtoon.title)}`;
  let notifInfo = webtoon.title;
  if (webtoon.type === WebtoonType.MANGA) {
    path += `\\${webtoon.info}`;
    notifInfo += ` - ${webtoon.info}`;
  }
  try {
    await _merge(webtoon.path, path, merge_method);
    useNotificationStore.getState().notifySuccess(`Merged ${notifInfo}`);
    if (openPath) await openFolder(path);
  } catch (error) {
    useNotificationStore
      .getState()
      .notifyError(`Failed to merge: ${Object.values(error)[0]}`);
  }
};

export const retrieveImage = async (url, domain, defImage) => {
  if (!domain) return defImage;
  try {
    const response = await _retrieveImage(domain, url);
    return response || defImage;
  } catch {
    return defImage;
  }
};

export const isUrlValid = (url) => {
  try {
    const { protocol } = new URL(url);
    return protocol === "http:" || protocol === "https:";
  } catch {
    return false;
  }
};

function _setupSubscriber(store, data, delay) {
  let timer = null;
  return store.subscribe((state) => {
    if (timer) clearTimeout(timer);
    if (state[data]) {
      timer = setTimeout(() => writeFile(`${data}.json`, state[data]), delay);
    }
  });
}

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
  const storeConfigs = [
    { store: useQueueStore, key: "queue", delay: DelayTimes.LONG },
    { store: useLibraryStore, key: "library", delay: DelayTimes.SHORT },
    { store: useSettingsStore, key: "settings", delay: DelayTimes.SHORT },
    { store: useFavoritesStore, key: "favorites", delay: DelayTimes.SHORT },
    { store: useDownloadedStore, key: "downloaded", delay: DelayTimes.LONG },
  ];
  storeConfigs.map(({ store, key, delay }) =>
    _setupSubscriber(store, key, delay)
  );
};

export const showHideModal = (id, show) =>
  (document.getElementById(id).style.display = show ? "block" : "none");
