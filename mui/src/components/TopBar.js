import React, { useState } from "react";
import "./../styles/Topbar.css";
import Sidebar from "./SideBar";

function TopBar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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
            defaultChecked={isMenuOpen}
          ></input>
          <label class="menu-toggle" htmlFor="menu-checkbox">
            <div id="menu-bar1" class="menu-bars"></div>
            <div id="menu-bar2" class="menu-bars"></div>
            <div id="menu-bar3" class="menu-bars"></div>
          </label>
        </div>
        <div className="titleBarText">Manga Downloader</div>
        <div className="titleBarBtns">
          <button
            className="topBtn minimizeBtn"
            onClick={() => window.do.minimizeApp()}
          >
            <img alt="" src="./assets/minimize.svg" className="icon-t"></img>
          </button>
          <button
            className="topBtn closeBtn"
            onClick={() => window.do.closeApp()}
          >
            <img alt="" src="./assets/delete.svg" className="icon-t"></img>
          </button>
        </div>
      </div>
      <div className="contentArea">
        <div id="mySidebar" className="leftMenu">
          {isMenuOpen && <Sidebar />}
        </div>
      </div>
    </div>
  );
}

export default TopBar;
