import "./../App.css";
import React from "react";
import { Link } from "react-router-dom";

function HomePage() {
  return (
    <div className="container">
      <div className="App">
        <div className="App-header">
          <h1>Manga Downloader</h1>
        </div>
        <Link to={{ pathname: "library" }}>
          <button className="home-button buttonh">
            <img alt="" src="./assets/library.svg" className="icon"></img>
          </button>
        </Link>
        <Link to={{ pathname: "search" }}>
          <button className="home-button buttonh">
            <img alt="" src="./assets/search.svg" className="icon"></img>
          </button>
        </Link>
        <Link to={{ pathname: "modules" }}>
          <button className="home-button buttonh">
            <img alt="" src="./assets/module.svg" className="icon"></img>
          </button>
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
