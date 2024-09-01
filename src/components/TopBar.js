import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SideBar } from ".";
import { getAppWindow, WebtoonType } from "../utils";
import { useDownloadingStore, useDownloadedStore } from "../store";

export default function TopBar() {
  const navigate = useNavigate();
  const appWindow = getAppWindow();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { downloading } = useDownloadingStore();
  const { downloaded } = useDownloadedStore();
  let downloadLabel, item;
  if (downloading) {
    downloadLabel = `Downloading ${downloading.title}`;
    item = downloading;
  } else if (downloaded.length > 0) {
    downloadLabel = `Downloaded ${downloaded[0].title}`;
    item = downloaded[0];
  }
  if (item && item.type === WebtoonType.MANGA) downloadLabel += ` ${item.info}`;

  function showHideMenus() {
    document.getElementById("mySidebar").style.width = isMenuOpen
      ? "45px"
      : "0px";
    setIsMenuOpen(!isMenuOpen);
  }

  return (
    <div data-tauri-drag-region className="mainApp">
      <div data-tauri-drag-region className="topBar">
        <div className="titleBar">
          <input
            id="menu-checkbox"
            type="checkbox"
            onChange={showHideMenus}
            checked={isMenuOpen}
          ></input>
          <label className="menu-toggle" htmlFor="menu-checkbox">
            <div id="menu-bar1" className="menu-bars"></div>
            <div id="menu-bar2" className="menu-bars"></div>
            <div id="menu-bar3" className="menu-bars"></div>
          </label>
        </div>
        <div data-tauri-drag-region className="titleBarText">
          <div data-tauri-drag-region className="titleText">
            Manga Downloader
          </div>
        </div>
        <div className="titleBarBtns">
          <button className="d-buttonh" onClick={() => navigate("download")}>
            <img
              alt=""
              src="./assets/download-st.svg"
              className="icon-t"
              style={{ width: "20px", height: "20px", marginRight: "3px" }}
            ></img>
            {downloadLabel && (
              <span className="d-tooltip">{downloadLabel}</span>
            )}
          </button>
          <button
            className="topBtn minimizeBtn"
            onClick={() => appWindow.minimize()}
          >
            <img alt="" src="./assets/minimize.svg" className="icon-t"></img>
          </button>
          <button className="topBtn closeBtn" onClick={() => appWindow.close()}>
            <img alt="" src="./assets/delete.svg" className="icon-t"></img>
          </button>
        </div>
      </div>
      <div data-tauri-drag-region className="contentArea">
        <div id="mySidebar" className="leftMenu" onClick={showHideMenus}>
          {isMenuOpen && <SideBar />}
        </div>
      </div>
    </div>
  );
}
