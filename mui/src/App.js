import React from "react";
import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Modules from "./pages/Modules";
import LPage from "./pages/Library";
import TopBar from "./components/TopBar";
import Search from "./pages/Search";
import HomePage from "./pages/Home";
import Webtoon from "./pages/Webtoon";

function App() {
  return (
    <Router>
      <div>
        <TopBar />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/library" element={<LPage />} />
          <Route path="/search" element={<Search />} />
          <Route path="/modules" element={<Modules />} />
          <Route path="/:module/webtoon/:url" element={<Webtoon />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
