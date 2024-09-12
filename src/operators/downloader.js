import {
  useQueueStore,
  useLibraryStore,
  useSettingsStore,
  useDownloadedStore,
  useDownloadingStore,
  useNotificationStore,
} from "../store";
import {
  merge,
  convert,
  getImages,
  WebtoonType,
  downloadImage,
  readDirectory,
  validateImage,
  fixFolderName,
  DownloadStatus,
  createDirectory,
} from "../utils";

export default function attemptToDownload() {
  const webtoon = useQueueStore
    .getState()
    .queue.find((item) => item.status === DownloadStatus.STARTED);
  if (useDownloadingStore.getState().downloading || !webtoon) return;
  useDownloadingStore.getState().setDownloading(webtoon);
  useDownloadingStore.getState().setStopRequested(false);
  downloader(webtoon);
}

async function downloader(webtoon) {
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
  if (
    webtoon.inLibrary &&
    useLibraryStore
      .getState()
      .library.find(
        (item) => item.id === webtoon.id.split("_$_").slice(0, 2).join("_$_")
      )
  ) {
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
  useNotificationStore.getState().notifySuccess(`Downloaded ${notifInfo}`);
  if (settings.auto_merge) merge(webtoon, false);
  if (settings.auto_convert) convert(webtoon, false);
  useDownloadingStore.getState().clearDownloading();
  useQueueStore.getState().removeFromQueue(webtoon.id);
  attemptToDownload();
}
