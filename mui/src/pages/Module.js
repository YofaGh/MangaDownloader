import "./../App.css";
import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import "./Module.css";

function Module() {
  const { module } = useParams();
  const [input, setInput] = useState("");

  return (
    <div className="container">
      <div style={{ display: "flex" }}>
        <SearchBar input={input} setInput={setInput} />
        <Link to={`/${module}/webtoon/${input}`} state={{ backUrl: "library" }}>
          <button className="m-button goto-btn">
            <img alt="" src="./assets/goto.svg" className="btn-icon"></img>
          </button>
        </Link>
        <button className="m-button search-btn">
          <img alt="" src="./assets/search.svg" className="btn-icon"></img>
        </button>
      </div>
    </div>
  );
}

export default Module;
