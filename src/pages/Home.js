import { HomeButton } from "../components";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="container">
      <div className="App">
        <div className="App-header">
          <h1>Manga Downloader</h1>
        </div>
        <div className="home-buttons">
          <Link to={{ pathname: "library" }}>
            <HomeButton label={"Library"} svg={"./assets/library.svg"} />
          </Link>
          <Link to={{ pathname: "search" }}>
            <HomeButton label={"Search"} svg={"./assets/search.svg"} />
          </Link>
          <Link to={{ pathname: "download" }}>
            <HomeButton label={"Download"} svg={"./assets/dPage.svg"} />
          </Link>
          <Link to={{ pathname: "modules" }}>
            <HomeButton label={"Modules"} svg={"./assets/module.svg"} />
          </Link>
          <Link to={{ pathname: "favorites" }}>
            <HomeButton label={"Favorites"} svg={"./assets/favorites.svg"} />
          </Link>
          <Link to={{ pathname: "saucer" }}>
            <HomeButton label={"Saucer"} svg={"./assets/saucer.svg"} />
          </Link>
        </div>
      </div>
    </div>
  );
}
