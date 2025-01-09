import { Link } from "react-router-dom";
import { HomeButton } from "../components";

export default function Home() {
  return (
    <div className="container">
      <div className="App">
        <div className="App-header">
          <h1>Manga Downloader</h1>
        </div>
        <div className="home-buttons">
          <Link to={{ pathname: "library" }}>
            <HomeButton label="Library" svgName="library" />
          </Link>
          <Link to={{ pathname: "search" }}>
            <HomeButton label="Search" svgName="search" />
          </Link>
          <Link to={{ pathname: "download" }}>
            <HomeButton label="Download" svgName="dPage" />
          </Link>
          <Link to={{ pathname: "modules" }}>
            <HomeButton label="Modules" svgName="module" />
          </Link>
          <Link to={{ pathname: "favorites" }}>
            <HomeButton label="Favorites" svgName="heart" />
          </Link>
          <Link to={{ pathname: "saucer" }}>
            <HomeButton label="Saucer" svgName="saucer" />
          </Link>
        </div>
      </div>
    </div>
  );
}
