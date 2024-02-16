import React, { useState } from "react";
import "./../styles/Topbar.css";
import Sidebar from "./SideBar";
import { useNavigate } from "react-router-dom";
import { invoke } from '@tauri-apps/api/tauri'

export default function TopBar({ currentDownloadStatus }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const navigate = useNavigate();
  let currentDownloadLabel = null;
  if (currentDownloadStatus.downloading) {
    currentDownloadLabel = `Downlading ${currentDownloadStatus.downloading.title}`;
    if (currentDownloadStatus.downloading.type === "manga") {
      currentDownloadLabel += ` ${currentDownloadStatus.downloading.info}`;
    }
  }
  if (currentDownloadStatus.downloaded) {
    currentDownloadLabel = `Downladed ${currentDownloadStatus.downloaded.title}`;
    if (currentDownloadStatus.downloaded.type === "manga") {
      currentDownloadLabel += ` ${currentDownloadStatus.downloaded.info}`;
    }
  }

  function showHideMenus() {
    document.getElementById("mySidebar").style.width = isMenuOpen
      ? "45px"
      : "0px";
    setIsMenuOpen(!isMenuOpen);
  }

  return (
    <div className="mainApp">
      <div className="topBar">
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
        <div className="titleBarText">
          <div className="titleText">Manga Downloader</div>
        </div>
        <div className="titleBarBtns">
          <button
            className="d-buttonh"
            onClick={() => {
              navigate("download");
            }}
          >
            <img
              alt=""
              src="./assets/download-st.svg"
              className="icon-t"
              style={{ width: "20px", height: "20px", marginRight: "3px" }}
            ></img>
            {currentDownloadLabel && (
              <span className="d-tooltip">{currentDownloadLabel}</span>
            )}
          </button>
          <button
            className="topBtn minimizeBtn"
            onClick={() => window.do.minimizeApp()}
          >
            <img alt="" src="./assets/minimize.svg" className="icon-t"></img>
          </button>
          <button
            className="topBtn closeBtn"
            onClick={() => invoke('close_app')}
          >
            <img alt="" src="./assets/delete.svg" className="icon-t"></img>
          </button>
        </div>
      </div>
      <div className="contentArea">
        <div id="mySidebar" className="leftMenu">
          {isMenuOpen && <Sidebar showHideMenus={showHideMenus} />}
        </div>
      </div>
    </div>
  );
}
