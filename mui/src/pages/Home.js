import "./../App.css";
import "./home.css";
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
          <button className="home-button library"></button>
        </Link>
        <Link to={{ pathname: "search" }}>
          <button className="home-button search"></button>
        </Link>
        <Link to={{ pathname: "modules" }}>
          <button className="home-button modules"></button>
        </Link>
      </div>
    </div>
  );
}

export default HomePage;
