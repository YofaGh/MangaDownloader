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
  joinPath,
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
  downloader(webtoon).finally(() => {
    setTimeout(attemptToDownload, 0);
  });
}

const getImageName = (image, i) =>
  `${String(i + 1).padStart(3, "0")}.${image.split(".").pop()}`;

async function downloader(webtoon) {
  const settings = useSettingsStore.getState().settings;
  const { updateItemInQueue } = useQueueStore.getState();
  const [images, saved_n] = await getImages(
    webtoon.module,
    webtoon.manga || webtoon.doujin,
    webtoon.chapter || ""
  );
  if (images.length === 0) return;
  let lastCorrupted = "";
  let paths = [settings.download_path, fixFolderName(webtoon.title)];
  if (webtoon.type === WebtoonType.MANGA) paths.push(webtoon.info);
  let downloadPath = (await joinPath(...paths)).replace(/\\/g, '/');
  try {
    await createDirectory(downloadPath);
  } catch (error) {
    useDownloadingStore.getState().clearDownloading();
    updateItemInQueue(webtoon.id, { status: DownloadStatus.STOPPED });
    useNotificationStore.getState().notifyError(Object.values(error)[0]);
    return;
  }
  updateItemInQueue(webtoon.id, { total: images.length });
  const existsImages = (await readDirectory(downloadPath)).map(path => path.replace(/\\/g, '/'));
  let i = 0;
  while (i < images.length) {
    if (useDownloadingStore.getState().stopRequested) return;
    updateItemInQueue(webtoon.id, { image: i + 1 });
    let savePath = Array.isArray(saved_n)
      ? saved_n[i]
      : getImageName(images[i], i);
    savePath = `${downloadPath}/${savePath}`;
    if (!existsImages.includes(savePath)) {
      const response = await downloadImage(webtoon.module, images[i], savePath);
      if (response && response !== "") {
        const isImageValid = await validateImage(response);
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
}
