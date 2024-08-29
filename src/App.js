import { useEffect, useRef } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
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
  startDownloading,
  writeFile,
  startUp,
} from "./components";
import {
  useSettingsStore,
  useDownloadedStore,
  useFavoritesStore,
  useLibraryStore,
  useQueueStore,
  useDownloadingStore,
} from "./store";

export default function App() {
  const { settings } = useSettingsStore();
  const { queue } = useQueueStore();
  const { downloaded } = useDownloadedStore();
  const { library } = useLibraryStore();
  const { favorites } = useFavoritesStore();
  const { downloading } = useDownloadingStore();
  const debouncerDelay = 2000;
  const isFirstRender = useRef(true);

  const useDebouncedWriteFile = (fileName, data, delay) => {
    const timerRef = useRef(null);
    useEffect(() => {
      if (!data) return;
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => writeFile(fileName, data), delay);
      return () => clearTimeout(timerRef.current);
    }, [data, fileName, delay]);
  };

  useEffect(() => {
    startUp();
  }, []);

  useEffect(() => {
    if (!isFirstRender.current || !settings) return;
    isFirstRender.current = false;
    if (settings && !settings.download_path)
      document.getElementById("browse-modal").style.display = "block";
  }, [settings]);

  useEffect(() => {
    if (!downloading) startDownloading();
  }, [downloading, queue]);

  useDebouncedWriteFile("queue.json", queue, debouncerDelay);
  useDebouncedWriteFile("downloaded.json", downloaded, debouncerDelay);
  useDebouncedWriteFile("settings.json", settings, debouncerDelay);
  useDebouncedWriteFile("favorites.json", favorites, debouncerDelay);
  useDebouncedWriteFile("library.json", library, debouncerDelay);

  return (
    <HashRouter>
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
    </HashRouter>
  );
}
