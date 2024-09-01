import {
  useDownloadedStore,
  useDownloadingStore,
  useFavoritesStore,
  useLibraryStore,
  useModulesStore,
  useNotificationStore,
  useQueueStore,
  useSauceStore,
  useSearchStore,
  useSettingsStore,
} from "../store";
import {
  _convert,
  _merge,
  _retrieveImage,
  _readFile,
  _writeFile,
  createDirectory,
  downloadImage,
  getImages,
  getModules,
  openFolder,
  readDirectory,
  searchByKeyword,
  sauce,
  validateImage,
  DownloadStatus,
  WebtoonType,
} from ".";

export const fixFolderName = (manga) =>
  manga.replace(/[/:*?"><|]+/g, "").replace(/\.*$/, "");

export const convert = async (webtoon, openPath) => {
  let pdfName = fixFolderName(webtoon.title);
  let notifInfo = webtoon.title;
  if (webtoon.type === WebtoonType.MANGA) {
    pdfName += `_${webtoon.info}`;
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
    const response = await _retrieveImage(domain, url);
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

export const attemptToDownload = async () => {
  const webtoon = useQueueStore
    .getState()
    .queue.find((item) => item.status === DownloadStatus.STARTED);
  if (useDownloadingStore.getState().downloading || !webtoon) return;
  useDownloadingStore.getState().setDownloading(webtoon);
  useDownloadingStore.getState().setStopRequested(false);
  startDownloading(webtoon);
};

const startDownloading = async (webtoon) => {
  const settings = useSettingsStore.getState().settings;
  const { updateItemInQueue } = useQueueStore.getState();
  const [images, saved_n] = await getImages(
    webtoon.module,
    webtoon.manga || webtoon.doujin,
    webtoon.chapter || ""
  );
  let lastCorrupted = "";
  let downloadPath = `${settings.download_path}\\${fixFolderName(
    webtoon.title
  )}`;
  if (webtoon.type === WebtoonType.MANGA) downloadPath += `\\${webtoon.info}`;
  await createDirectory(downloadPath);
  updateItemInQueue(webtoon.id, { total: images.length });
  const existsImages = await readDirectory(downloadPath);
  let i = 0;
  while (i < images.length) {
    if (useDownloadingStore.getState().stopRequested) return;
    updateItemInQueue(webtoon.id, { image: i + 1 });
    let savePath = Array.isArray(saved_n)
      ? `${downloadPath}\\${saved_n[i]}`
      : `${downloadPath}\\${String(i + 1).padStart(3, "0")}.${images[i]
          .split(".")
          .pop()}`;
    if (!existsImages.includes(savePath)) {
      const response = await downloadImage(webtoon.module, images[i], savePath);
      if (response && response !== "") {
        const isImageValid = await validateImage(
          response.trim().replace(/"/g, "").replace(/\\\\/g, "\\")
        );
        if (!isImageValid && lastCorrupted !== response) {
          lastCorrupted = response;
          continue;
        }
      }
      await new Promise((resolve) =>
        setTimeout(resolve, settings.sleep_time * 1000)
      );
    }
    i++;
  }
  if (webtoon.inLibrary) {
    useLibraryStore
      .getState()
      .updateItemInLibrary(`${webtoon.module}_$_${webtoon.manga}`, {
        last_downloaded_chapter: {
          name: webtoon.info,
          url: webtoon.chapter,
        },
      });
  }
  let inf = { doujin: webtoon.doujin };
  let notifInfo = webtoon.title;
  if (webtoon.type === WebtoonType.MANGA) {
    inf = { manga: webtoon.manga, chapter: webtoon.chapter };
    notifInfo += ` - ${webtoon.info}`;
  }
  useDownloadedStore.getState().addToDownloaded({
    path: downloadPath,
    images: images.length,
    title: webtoon.title,
    info: webtoon.info,
    module: webtoon.module,
    type: webtoon.type,
    id: webtoon.id,
    ...inf,
  });
  useNotificationStore
    .getState()
    .addSuccessNotification(`Downloaded ${notifInfo}`);
  if (settings.auto_merge) merge(webtoon, false);
  if (settings.auto_convert) convert(webtoon, false);
  useQueueStore.getState().removeFromQueue(webtoon.id);
  useDownloadingStore.getState().clearDownloading();
};

export const startSearching = async () => {
  const {
    searchKeyword,
    searchDepth,
    searchAbsolute,
    setSearching,
    doneSearching,
    setSearchKeyword,
    addSearchResult,
    setSelectedSearchModules,
    clearSearch,
    searchModuleTypes,
  } = useSearchStore.getState();
  clearSearch();
  const selectedSearchModules = useModulesStore
    .getState()
    .modules.filter(
      (module) =>
        searchModuleTypes.some(
          (type) => type.name === module.type && type.selected
        ) &&
        module.searchable &&
        module.selected
    )
    .map((item) => item.domain);
  setSearchKeyword(searchKeyword);
  setSelectedSearchModules(selectedSearchModules);
  const sleepTime = useSettingsStore.getState().settings.sleep_time;
  for (const module of selectedSearchModules) {
    if (useSearchStore.getState().stopRequested) return;
    setSearching(module);
    addSearchResult(
      await searchByKeyword(
        module,
        searchKeyword,
        sleepTime,
        searchDepth,
        searchAbsolute
      )
    );
  }
  doneSearching();
};

export const startSaucer = async () => {
  const { sauceUrl, saucers, setSauceStatus, addSauceResult } =
    useSauceStore.getState();
  const { addErrorNotification, addSuccessNotification } =
    useNotificationStore.getState();
  if (!isUrlValid(sauceUrl)) {
    addErrorNotification("Invalid URL");
    setSauceStatus(null);
    return;
  }
  for (let i = 0; i < saucers.length; i++) {
    const site = saucers[i];
    let element = document.getElementById(site);
    element.classList.add("active");
    const res = await sauce(site, sauceUrl);
    addSauceResult(res.map((item) => ({ site, ...item })));
    element.classList.remove("active");
    element.classList.remove("done");
    document.querySelector(".steps-indicator").style.width =
      (i + 1) * 120 + "px";
  }
  addSuccessNotification("Sauced");
  setSauceStatus("Sauced");
};

export const writeFile = async (fileName, data) => {
  if (fileName === "library.json") {
    data = data.reduce((acc, { title, ...details }) => {
      acc[title] = details;
      return acc;
    }, {});
  }
  await _writeFile(fileName, JSON.stringify(data, null, 2));
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
      const contents = await _readFile(file);
      let data = JSON.parse(contents);
      if (file === "queue.json") {
        data = data.map((item) => ({
          ...item,
          status:
            item.status === DownloadStatus.STARTED
              ? DownloadStatus.PAUSED
              : item.status,
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
    const response = await getModules();
    useModulesStore
      .getState()
      .setModules(response.map((module) => ({ ...module, selected: true })));
  })();
};

export const showHideModal = (id, show) =>
  (document.getElementById(id).style.display = show ? "block" : "none");
