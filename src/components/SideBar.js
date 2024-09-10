import { Link } from "react-router-dom";
import { Icon } from ".";

export default function SideBar() {
  return (
    <div className="sidebar">
      <Link to={{ pathname: "/" }}>
        <button className="buttonh">
          <Icon svgName="home" />
        </button>
      </Link>
      <Link to={{ pathname: "library" }}>
        <button className="buttonh">
          <Icon svgName="library" />
        </button>
      </Link>
      <Link to={{ pathname: "search" }}>
        <button className="buttonh">
          <Icon svgName="search" />
        </button>
      </Link>
      <Link to={{ pathname: "download" }}>
        <button className="buttonh">
          <Icon svgName="dPage" />
        </button>
      </Link>
      <Link to={{ pathname: "modules" }}>
        <button className="buttonh">
          <Icon svgName="module" />
        </button>
      </Link>
      <Link to={{ pathname: "favorites" }}>
        <button className="buttonh">
          <Icon svgName="favorites" />
        </button>
      </Link>
      <Link to={{ pathname: "saucer" }}>
        <button className="buttonh">
          <Icon svgName="saucer" />
        </button>
      </Link>
      <Link to={{ pathname: "about" }} style={{ marginTop: "auto" }}>
        <button className="buttonh">
          <Icon svgName="about" />
        </button>
      </Link>
      <Link to={{ pathname: "settings" }} style={{ marginBottom: "40px" }}>
        <button className="buttonh buttonhg">
          <Icon svgName="settings" />
        </button>
      </Link>
    </div>
  );
}
