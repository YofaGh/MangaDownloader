import { useEffect } from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import {
  Modules,
  Library,
  Search,
  HomePage,
  Webtoon,
  Module,
  Download,
  Favorites,
  Saucer,
  Settings,
  About,
} from "./pages";
import {
  TopBar,
  NotificationProvider,
  DownloadPathModal,
  fixNameForFolder,
  convert,
  merge,
} from "./components";
import {
  useNotificationStore,
  useSettingsStore,
  useDownloadedStore,
  useFavoritesStore,
  useLibraryStore,
  useQueueStore,
  useQueueMessagesStore,
  useLibraryMessagesStore,
  useDownloadedMessagesStore,
  useDownloadingStore,
} from "./store";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import {
  readTextFile,
  writeTextFile,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";

export default function App() {
  const { addNotification } = useNotificationStore();
  const { settings, updateSettings } = useSettingsStore();
  const {
    queue,
    setQueue,
    addToQueue,
    removeFromQueue,
    updateItemInQueue,
    reOrderQueue,
    deleteItemKeysInQueue,
    deleteKeysFromAllItemsInQueue,
    updateAllItemsInQueue,
  } = useQueueStore();
  const {
    downloaded,
    setDownloaded,
    addToDownloaded,
    deleteDownloadedByIndex,
    deleteAllDownloaded,
  } = useDownloadedStore();
  const {
    library,
    setLibrary,
    addToLibrary,
    removeFromLibrary,
    updateItemInLibrary,
  } = useLibraryStore();
  const { favorites, setFavorites } = useFavoritesStore();
  const { downloading, setDownloading, clearDownloading } =
    useDownloadingStore();
  const { downloadedMessages, addDownloadedMessage } =
    useDownloadedMessagesStore();
  const { queueMessages, addQueueMessage } = useQueueMessagesStore();
  const { libraryMessages, addLibraryMessage } = useLibraryMessagesStore();

  const readFile = async (file, setter) => {
    readTextFile(file, { baseDir: BaseDirectory.AppData }, "utf8").then(
      (contents) => {
        const data = JSON.parse(contents);
        const transformedData =
          file === "library.json"
            ? Object.entries(data).map(([title, details]) => ({
                title,
                status: details.include,
                domain: details.domain,
                url: details.url,
                cover: details.cover,
                last_downloaded_chapter: details.last_downloaded_chapter,
              }))
            : data;
        setter(transformedData);
      }
    );
  };

  const writeFile = async (fileName, data) => {
    if (!data) {
      return;
    }
    if (fileName === "library.json") {
      data = data.reduce(
        (
          acc,
          { title, status, domain, url, cover, last_downloaded_chapter }
        ) => {
          acc[title] = {
            include: status,
            domain,
            url,
            cover,
            last_downloaded_chapter,
          };
          return acc;
        },
        {}
      );
    }
    await writeTextFile(
      fileName,
      JSON.stringify(data, null, 2),
      { baseDir: BaseDirectory.AppData },
      "utf8"
    );
  };

  const removeDirectory = async (path, recursive) => {
    await invoke("remove_directory", { path, recursive });
  };

  const stopDownloader = async () => {
    await invoke("stop_download");
    clearDownloading();
  };

  useEffect(() => {
    readFile("settings.json", updateSettings);
    readFile("queue.json", setQueue);
    readFile("downloaded.json", setDownloaded);
    readFile("favorites.json", setFavorites);
    readFile("library.json", setLibrary);
  }, []);

  useEffect(() => {
    if (!settings) {
      return;
    }
    if (settings.download_path) {
      startDownloading();
    } else {
      document.getElementById("browse-modal").style.display = "block";
    }
  }, [settings]);

  useEffect(() => {
    while (queueMessages.length > 0) {
      const message = queueMessages.shift();
      if (message.setWebtoonStatus) {
        updateItemInQueue(message.setWebtoonStatus.webtoon.id, {
          status: message.setWebtoonStatus.status,
        });
        if (
          downloading &&
          message.setWebtoonStatus.webtoon.id === downloading.id &&
          (message.setWebtoonStatus.status === "Paused" ||
            message.setWebtoonStatus.status === "Not Started")
        ) {
          stopDownloader();
        }
        if (message.setWebtoonStatus.status === "Not Started") {
          deleteItemKeysInQueue(message.setWebtoonStatus.webtoon.id, [
            "downloading",
            "totalImages",
          ]);
          let folderName =
            message.setWebtoonStatus.webtoon.type === "manga"
              ? `${fixNameForFolder(message.setWebtoonStatus.webtoon.title)}/${
                  message.setWebtoonStatus.webtoon.info
                }`
              : fixNameForFolder(message.setWebtoonStatus.webtoon.title);
          removeDirectory(`${settings.download_path}/${folderName}`, true);
          if (message.setWebtoonStatus.webtoon.type === "manga") {
            removeDirectory(
              `${settings.download_path}/${fixNameForFolder(
                message.setWebtoonStatus.webtoon.title
              )}`,
              false
            );
          }
        }
        if (message.setWebtoonStatus.status === "Started" && !downloading) {
          startDownloading();
        }
      }
      if (message.setAllWebtoonsStatus) {
        updateAllItemsInQueue({ status: message.setAllWebtoonsStatus.status });
        if (
          (message.setAllWebtoonsStatus.status === "Paused" ||
            message.setAllWebtoonsStatus.status === "Not Started") &&
          downloading
        ) {
          stopDownloader();
        }
        if (message.setAllWebtoonsStatus.status === "Not Started") {
          deleteKeysFromAllItemsInQueue(["downloading", "totalImages"]);
          for (const webtoon of queue) {
            let folderName =
              webtoon.type === "manga"
                ? `${fixNameForFolder(webtoon.title)}/${webtoon.info}`
                : fixNameForFolder(webtoon.title);
            removeDirectory(`${settings.download_path}/${folderName}`, true);
            if (webtoon.type === "manga") {
              removeDirectory(
                `${settings.download_path}/${fixNameForFolder(webtoon.title)}`,
                false
              );
            }
          }
        }
        if (message.setAllWebtoonsStatus.status === "Started" && !downloading) {
          startDownloading();
        }
      }
      if (message.done) {
        clearDownloading();
        let webtoon = queue.find((item) => item.id === message.done.id);
        removeFromQueue(message.done.id);
        if (webtoon.in_library) {
          addLibraryMessage({
            updateWebtoon: {
              domain: webtoon.module,
              url: webtoon.manga,
              last_downloaded_chapter: {
                name: webtoon.info,
                url: webtoon.chapter,
              },
            },
          });
        }
        webtoon.images = webtoon.totalImages;
        webtoon.path = message.done.download_path;
        delete webtoon.status;
        delete webtoon.in_library;
        delete webtoon.downloading;
        delete webtoon.totalImages;
        addDownloadedMessage({ addWebtoon: { webtoon } });
        addNotification(
          webtoon.type === "manga"
            ? `Downloaded ${webtoon.title} - ${webtoon.info}`
            : `Downloaded ${webtoon.title}`,
          "SUCCESS"
        );
        if (settings.auto_merge) {
          merge(
            webtoon,
            settings.download_path,
            settings.merge_method,
            false,
            addNotification,
            invoke,
            null
          );
        }
        if (settings.auto_convert) {
          convert(webtoon, false, addNotification, invoke, null);
        }
      }
      if (message.removeWebtoon) {
        removeFromQueue(message.removeWebtoon.webtoon.id);
        addNotification(
          message.removeWebtoon.webtoon.type === "manga"
            ? `Removed ${message.removeWebtoon.webtoon.title} - ${message.removeWebtoon.webtoon.info} from queue`
            : `Removed ${message.removeWebtoon.webtoon.title} from queue`,
          "SUCCESS"
        );
        if (
          downloading &&
          message.removeWebtoon.webtoon.id === downloading.id
        ) {
          stopDownloader();
        }
        let folderName =
          message.removeWebtoon.webtoon.type === "manga"
            ? `${fixNameForFolder(message.removeWebtoon.webtoon.title)}/${
                message.removeWebtoon.webtoon.info
              }`
            : fixNameForFolder(message.removeWebtoon.webtoon.title);
        removeDirectory(`${settings.download_path}/${folderName}`, true);
      }
      if (message.addWebtoon) {
        if (!queue.find((item) => item.id === message.addWebtoon.webtoon.id)) {
          addToQueue(message.addWebtoon.webtoon);
          addNotification(
            message.addWebtoon.webtoon.type === "manga"
              ? `Added ${message.addWebtoon.webtoon.title} - ${message.addWebtoon.webtoon.info} to queue`
              : `Added ${message.addWebtoon.webtoon.title} to queue`,
            "SUCCESS"
          );
        } else {
          updateItemInQueue(message.addWebtoon.webtoon);
          addNotification(
            message.addWebtoon.webtoon.type === "manga"
              ? `Updated ${message.addWebtoon.webtoon.title} - ${message.addWebtoon.webtoon.info} in queue`
              : `Updated ${message.addWebtoon.webtoon.title} in queue`,
            "SUCCESS"
          );
        }
      }
      if (message.downloading) {
        updateItemInQueue(message.downloading.id, {
          downloading: message.downloading.image,
        });
      }
      if (message.totalImages) {
        updateItemInQueue(message.totalImages.id, {
          totalImages: message.totalImages.total,
        });
      }
      if (message.reOrderQueue) {
        reOrderQueue(message.reOrderQueue.order);
      }
    }
  }, [queueMessages, queue, downloading]);

  useEffect(() => {
    while (downloadedMessages.length > 0) {
      const message = downloadedMessages.shift();
      if (message.addWebtoon) {
        addToDownloaded(message.addWebtoon.webtoon);
      }
      if (message.removeWebtoon) {
        deleteDownloadedByIndex(message.removeWebtoon.index);
      }
      if (message.removeAllWebtoons) {
        deleteAllDownloaded();
      }
    }
  }, [downloadedMessages, downloaded]);

  useEffect(() => {
    if (!downloading) {
      startDownloading();
    }
  }, [downloading, queue]);

  useEffect(() => {
    writeFile("queue.json", queue);
  }, [queue]);

  useEffect(() => {
    writeFile("downloaded.json", downloaded);
  }, [downloaded]);

  useEffect(() => {
    writeFile("settings.json", settings);
  }, [settings]);

  useEffect(() => {
    writeFile("favorites.json", favorites);
  }, [favorites]);

  useEffect(() => {
    writeFile("library.json", library);
  }, [library]);

  useEffect(() => {
    while (libraryMessages.length > 0) {
      const message = libraryMessages.shift();
      if (message.addWebtoon) {
        addToLibrary(message.addWebtoon.webtoon);
        addNotification(
          `Added ${message.addWebtoon.webtoon.title} to library`,
          "SUCCESS"
        );
      }
      if (message.removeWebtoon) {
        let ww = library.find(
          (webtoon) =>
            `${webtoon.domain}_$_${webtoon.url}` ===
            `${message.removeWebtoon.domain}_$_${message.removeWebtoon.url}`
        );
        removeFromLibrary(
          message.removeWebtoon.domain,
          message.removeWebtoon.url
        );
        addNotification(`Removed ${ww.title} from library`, "SUCCESS");
      }
      if (message.updateWebtoon) {
        updateItemInLibrary(
          message.updateWebtoon.domain,
          message.updateWebtoon.url,
          {
            last_downloaded_chapter:
              message.updateWebtoon.last_downloaded_chapter,
          }
        );
      }
    }
  }, [libraryMessages, library]);

  const startDownloading = async () => {
    if (downloading) {
      return;
    }
    const webtoon = queue.find((item) => item.status === "Started");
    if (webtoon) {
      setDownloading(webtoon);
      const { totalImages, downloading, ...rest } = webtoon;
      invoke("download", {
        webtoon: rest,
        fixedTitle: fixNameForFolder(webtoon.title),
        sleepTime: settings.sleep_time,
        downloadPath: settings.download_path,
      });
      await listen("totalImages", (event) => {
        let totalImages = {
          totalImages: {
            id: event.payload.webtoon_id,
            total: event.payload.total_images,
          },
        };
        addQueueMessage(totalImages);
      });
      await listen("downloading", (event) => {
        let downloading = {
          downloading: {
            id: event.payload.webtoon_id,
            image: event.payload.image,
          },
        };
        addQueueMessage(downloading);
      });
      await listen("doneDownloading", (event) => {
        let done = {
          done: {
            id: event.payload.webtoon_id,
            download_path: event.payload.download_path,
          },
        };
        addQueueMessage(done);
      });
    }
  };

  return (
    <Router>
      <div>
        <TopBar />
        <NotificationProvider />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<Library />} />
          <Route path="/search" element={<Search />} />
          <Route path="/download" element={<Download />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/modules" element={<Modules />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/about" element={<About />} />
          <Route path="/saucer" element={<Saucer />} />
          <Route path="/:module/webtoon/:url*" element={<Webtoon />} />
          <Route path="/:module" element={<Module />} />
        </Routes>
        <DownloadPathModal startDownloading={startDownloading} />
      </div>
    </Router>
  );
}
