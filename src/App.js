import { useEffect, useRef } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import { writeFile, startUp } from "./utils";
import { TopBar, NotificationProvider, DownloadPathModal } from "./components";
import {
  Home,
  About,
  Search,
  Module,
  Saucer,
  Modules,
  Library,
  Webtoon,
  Download,
  Settings,
  Favorites,
} from "./pages";
import {
  useQueueStore,
  useLibraryStore,
  useSettingsStore,
  useFavoritesStore,
  useDownloadedStore,
} from "./store";

export default function App() {
  startUp();
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

  useStateSubscriber(useQueueStore, "queue", 2000);
  useStateSubscriber(useLibraryStore, "library", 500);
  useStateSubscriber(useSettingsStore, "settings", 500);
  useStateSubscriber(useFavoritesStore, "favorites", 500);
  useStateSubscriber(useDownloadedStore, "downloaded", 2000);

  return (
    <HashRouter>
      <TopBar />
      <NotificationProvider />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/search" element={<Search />} />
        <Route path="/saucer" element={<Saucer />} />
        <Route path="/:module" element={<Module />} />
        <Route path="/modules" element={<Modules />} />
        <Route path="/library" element={<Library />} />
        <Route path="/download" element={<Download />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/favorites" element={<Favorites />} />
        <Route path="/:module/webtoon/:url*" element={<Webtoon />} />
      </Routes>
      <DownloadPathModal />
    </HashRouter>
  );
}
