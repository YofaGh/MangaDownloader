import "./../App.css";
import React, { useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import "../styles/Module.css";

function Module() {
  const { domain } = useParams();
  const [input, setInput] = useState("");
  const module = useLocation().state.module;

  return (
    <div className="container">
      <div style={{ display: "flex" }}>
        <SearchBar input={input} setInput={setInput} />
        <Link to={`/${domain}/webtoon/${input}`} state={{ backUrl: "library" }}>
          <button className="m-button goto-btn">
            <img
              alt=""
              src="./assets/goto.svg"
              className="btn-icon"
              style={{ width: 20, height: 20 }}
            ></img>
          </button>
        </Link>
        {module.searchable && (
          <button className="m-button search-btn">
            <img
              alt=""
              src="./assets/search.svg"
              className="btn-icon"
              style={{ width: 20, height: 20 }}
            ></img>
          </button>
        )}
      </div>
    </div>
  );
}

export default Module;
