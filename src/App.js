import { useEffect, useRef } from "react";
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
  useDownloadingStore,
  useInitDownloadStore,
  useModulesStore,
} from "./store";
import { listen, once } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";
import {
  readTextFile,
  writeTextFile,
  BaseDirectory,
} from "@tauri-apps/plugin-fs";

export default function App() {
  const { addNotification } = useNotificationStore();
  const { settings, updateSettings } = useSettingsStore();
  const { queue, setQueue, removeFromQueue, updateItemInQueue } =
    useQueueStore();
  const { downloaded, setDownloaded, addToDownloaded } = useDownloadedStore();
  const { library, setLibrary, updateItemInLibrary } = useLibraryStore();
  const { favorites, setFavorites } = useFavoritesStore();
  const { downloading, setDownloading, clearDownloading } =
    useDownloadingStore();
  const setModules = useModulesStore((state) => state.setModules);
  const { initDownload, increaseInitDownload } = useInitDownloadStore();
  const debouncerDelay = 2000;
  const isFirstRender = useRef(true);

  const useDebouncedWriteFile = (fileName, data, delay) => {
    const timerRef = useRef(null);
    useEffect(() => {
      if (!data) return;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        writeFile(fileName, data);
      }, delay);
      return () => clearTimeout(timerRef.current);
    }, [data, fileName, delay]);
  };

  const writeFile = async (fileName, data) => {
    if (fileName === "library.json") {
      data = data.reduce(
        (
          acc,
          { id, title, status, domain, url, cover, last_downloaded_chapter }
        ) => {
          acc[title] = {
            include: status,
            id,
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

  useEffect(() => {
    const readFile = async (file, setter) => {
      readTextFile(file, { baseDir: BaseDirectory.AppData }, "utf8").then(
        (contents) => {
          const data = JSON.parse(contents);
          const transformedData =
            file === "library.json"
              ? Object.entries(data).map(([title, details]) => ({
                  title,
                  id: details.id,
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

    readFile("settings.json", updateSettings);
    readFile("queue.json", setQueue);
    readFile("downloaded.json", setDownloaded);
    readFile("favorites.json", setFavorites);
    readFile("library.json", setLibrary);
    (() => {
      invoke("get_modules").then((response) => {
        setModules(
          response.map((module) => {
            const item = { ...module };
            item.name = item.domain;
            delete item.domain;
            item.selected = true;
            return item;
          })
        );
      });
    })();
  }, []);

  useEffect(() => {
    if (!isFirstRender.current) return;
    isFirstRender.current = false;
    if (!settings) return;
    if (settings.download_path) increaseInitDownload();
    else document.getElementById("browse-modal").style.display = "block";
  }, [settings]);

  const startDownloading = async () => {
    if (downloading) return;
    const webtoon = queue.find((item) => item.status === "Started");
    if (!webtoon) return;
    setDownloading(webtoon);
    const { total, inLibrary, image, ...rest } = webtoon;
    invoke("download", {
      webtoon: rest,
      fixedTitle: fixNameForFolder(webtoon.title),
      sleepTime: settings.sleep_time,
      downloadPath: settings.download_path,
    });
    await once("totalImages", (event) => {
      updateItemInQueue(event.payload.webtoon_id, {
        total: event.payload.total_images,
      });
    });
    await listen("downloading", (event) => {
      updateItemInQueue(event.payload.webtoon_id, {
        image: event.payload.image,
      });
    });
    await once("doneDownloading", (event) => {
      let webt = queue.find((item) => item.id === event.payload.webtoon_id);
      if (webt.inLibrary) {
        updateItemInLibrary(`${webt.module}_$_${webt.manga}`, {
          last_downloaded_chapter: {
            name: webt.info,
            url: webt.chapter,
          },
        });
      }
      let inf =
        webt.type === "manga"
          ? { manga: webt.manga, chapter: webt.chapter }
          : { doujin: webt.doujin };
      addToDownloaded({
        path: event.payload.download_path,
        images: event.payload.total,
        title: webt.title,
        info: webt.info,
        module: webt.module,
        type: webt.type,
        id: webt.id,
        ...inf,
      });
      addNotification(
        webt.type === "manga"
          ? `Downloaded ${webt.title} - ${webt.info}`
          : `Downloaded ${webt.title}`,
        "SUCCESS"
      );
      if (settings.auto_merge) {
        merge(
          webt,
          settings.download_path,
          settings.merge_method,
          false,
          addNotification,
          invoke,
          null
        );
      }
      if (settings.auto_convert) {
        convert(webt, false, addNotification, invoke, null);
      }
      removeFromQueue(event.payload.webtoon_id);
      clearDownloading();
      increaseInitDownload();
    });
  };

  useEffect(() => {
    if (!downloading) startDownloading();
  }, [downloading, queue, initDownload]);

  useDebouncedWriteFile("queue.json", queue, debouncerDelay);
  useDebouncedWriteFile("downloaded.json", downloaded, debouncerDelay);
  useDebouncedWriteFile("settings.json", settings, debouncerDelay);
  useDebouncedWriteFile("favorites.json", favorites, debouncerDelay);
  useDebouncedWriteFile("library.json", library, debouncerDelay);

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
        <DownloadPathModal />
      </div>
    </Router>
  );
}
