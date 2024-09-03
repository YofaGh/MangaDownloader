import { useEffect, useRef } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { TopBar, NotificationProvider, DownloadPathModal } from "./components";
import { writeFile, startUp } from "./utils";
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
  useSettingsStore,
  useDownloadedStore,
  useFavoritesStore,
  useLibraryStore,
  useQueueStore,
} from "./store";

export default function App() {
  useEffect(() => {
    startUp();
  }, []);

  const useStateSubscriber = (useStore, data, delay) => {
    const timerRef = useRef(null);
    useEffect(() => {
      const unsubscribe = useStore.subscribe((state) => {
        if (timerRef.current) clearTimeout(timerRef.current);
        if (state[data])
          timerRef.current = setTimeout(
            () => writeFile(`${data}.json`, state[data]),
            delay
          );
      });
      return () => {
        clearTimeout(timerRef.current);
        unsubscribe();
      };
    }, [useStore, data, delay]);
  };

  useStateSubscriber(useFavoritesStore, "favorites", 500);
  useStateSubscriber(useLibraryStore, "library", 500);
  useStateSubscriber(useSettingsStore, "settings", 500);
  useStateSubscriber(useQueueStore, "queue", 2000);
  useStateSubscriber(useDownloadedStore, "downloaded", 2000);

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
