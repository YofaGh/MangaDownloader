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
          <button
            id="showHideMenus"
            className="toggleButton"
            onClick={() => showHideMenus()}
          ></button>
        </div>
        <div className="titleBarBtns">
          <button
            id="minimizeBtn"
            className="topBtn minimizeBtn"
            onClick={() => window.do.minimizeApp()}
          ></button>
          <button
            id="closeBtn"
            className="topBtn closeBtn"
            onClick={() => window.do.closeApp()}
          ></button>
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
