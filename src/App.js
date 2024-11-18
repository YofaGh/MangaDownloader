import { HashRouter, Routes, Route } from "react-router-dom";
import { startUp } from "./utils";
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

export default function App() {
  startUp();

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
        <Route path="/:module/webtoon/*" element={<Webtoon />} />
      </Routes>
      <DownloadPathModal />
    </HashRouter>
  );
}
