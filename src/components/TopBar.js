import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { SideBar, Icon } from ".";
import { getAppWindow, WebtoonType } from "../utils";
import { useDownloadingStore, useDownloadedStore } from "../store";

export default function TopBar() {
  const navigate = useNavigate();
  const appWindow = getAppWindow();
  const { downloaded } = useDownloadedStore();
  const { downloading } = useDownloadingStore();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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
            type="checkbox"
            id="menu-checkbox"
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
          <button className="buttonh d-buttonh" onClick={() => navigate("download")}>
            <Icon className="icon-t-d" svgName="download-st" />
            {downloadLabel && (
              <span className="d-tooltip">{downloadLabel}</span>
            )}
          </button>
          <button
            className="topBtn minimizeBtn"
            onClick={() => appWindow.minimize()}
          >
            <Icon svgName="minimize" className="icon-t" />
          </button>
          <button className="topBtn closeBtn" onClick={() => appWindow.close()}>
            <Icon svgName="delete" className="icon-t" />
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
