import "./../styles/SideBar.css";
import { Link } from "react-router-dom";

export default function SideBar({ showHideMenus }) {
  return (
    <div className="sidebar">
      <Link to={{ pathname: "/" }}>
        <button className="buttonh" onClick={showHideMenus}>
          <img alt="" src="./assets/home.svg" className="icon"></img>
        </button>
      </Link>
      <Link to={{ pathname: "library" }}>
        <button className="buttonh" onClick={showHideMenus}>
          <img alt="" src="./assets/library.svg" className="icon"></img>
        </button>
      </Link>
      <Link to={{ pathname: "search" }}>
        <button className="buttonh" onClick={showHideMenus}>
          <img alt="" src="./assets/search.svg" className="icon"></img>
        </button>
      </Link>
      <Link to={{ pathname: "download" }}>
        <button className="buttonh" onClick={showHideMenus}>
          <img alt="" src="./assets/dPage.svg" className="icon"></img>
        </button>
      </Link>
      <Link to={{ pathname: "modules" }}>
        <button className="buttonh" onClick={showHideMenus}>
          <img alt="" src="./assets/module.svg" className="icon"></img>
        </button>
      </Link>
      <Link to={{ pathname: "favorites" }}>
        <button className="buttonh" onClick={showHideMenus}>
          <img alt="" src="./assets/favorites.svg" className="icon"></img>
        </button>
      </Link>
      <Link to={{ pathname: "saucer" }}>
        <button className="buttonh" onClick={showHideMenus}>
          <img alt="" src="./assets/saucer.svg" className="icon"></img>
        </button>
      </Link>
      <Link to={{ pathname: "about" }} style={{ marginTop: "auto" }}>
        <button className="buttonh" onClick={showHideMenus}>
          <img alt="" src="./assets/about.svg" className="icon"></img>
        </button>
      </Link>
      <Link to={{ pathname: "settings" }} style={{ marginBottom: "40px" }}>
        <button className="buttonhg" onClick={showHideMenus}>
          <img alt="" src="./assets/settings.svg" className="icon"></img>
        </button>
      </Link>
    </div>
  );
}
