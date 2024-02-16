import "./../App.css";
import React, { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import SearchBar from "../components/SearchBar";
import PushButton from "../components/PushButton";
import WSearchCard from "../components/WSearchCard";
import Loading from "../components/Loading";
import { useSheller } from "../ShellerProvider";
import "../styles/Module.css";

export default function Module({ defaultSearchDepth, sleepTime, loadCovers }) {
  const { module } = useParams();
  const [input, setInput] = useState("");
  const [absolute, setAbsolute] = useState(false);
  const [results, setResults] = useState([]);
  const [depth, setDepth] = useState(defaultSearchDepth);
  const [searchingStatus, setSearchingStatus] = useState(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState("");
  const moduleDetm = useLocation().state.module;
  const sheller = useSheller();

  const showHideModal = (isShow) => {
    const modal = document.getElementById("mod-Modal");
    modal.style.display = isShow ? "block" : "none";
  };

  const startSearching = async () => {
    setSearchingStatus("searching");
    const response = await sheller([
      "search",
      module,
      input,
      sleepTime,
      absolute,
      depth,
    ]);
    setResults(response);
    setSearchingStatus("searched");
  };

  useEffect(() => {
    if (searchingStatus === "searched") {
      const sortMenu = document.getElementById("sort-menu");
      sortMenu.style.opacity = sortOpen ? "1" : "0";
    }
  }, [sortOpen, searchingStatus]);

  const updateSortBy = (newSortBy) => {
    setSortBy(newSortBy);
    results.sort(function (a, b) {
      if (a[newSortBy] < b[newSortBy]) return -1;
      if (a[newSortBy] > b[newSortBy]) return 1;
      return 0;
    });
    setSortOpen(!sortOpen);
  };

  const resetSearch = () => {
    setResults([]);
    setSearchingStatus(null);
  };

  let titleSortClass = `f-menu-item ${sortBy === "name" ? "selected" : ""}`;
  let pageSortClass = `f-menu-item ${sortBy === "page" ? "selected" : ""}`;

  if (searchingStatus === null) {
    return (
      <div className="container">
        <div style={{ display: "flex" }}>
          <button
            className="m-button filter-btn"
            onClick={() => showHideModal(true)}
          >
            <img alt="" src="./assets/filter.svg" className="btn-icon"></img>
          </button>
          <SearchBar
            input={input}
            setInput={setInput}
            placeHolder={`Search anything or Enter Webtoon URL ${
              moduleDetm.is_coded ? "or Enter Doujin Code" : ""
            }`}
          />
          <Link to={`/${module}/webtoon/${input}`}>
            <button className="m-button goto-btn">
              <img
                alt=""
                src="./assets/goto.svg"
                className="btn-icon"
                style={{ width: 20, height: 20 }}
              ></img>
            </button>
          </Link>
          {moduleDetm.searchable && (
            <button className="m-button search-btn" onClick={startSearching}>
              <img
                alt=""
                src="./assets/search.svg"
                className="btn-icon"
                style={{ width: 20, height: 20 }}
              ></img>
            </button>
          )}
        </div>
        <div id="mod-Modal" className="modal">
          <div className="modal-content">
            <button
              className="buttonh closeBtn"
              onClick={() => showHideModal(false)}
            >
              <img alt="" src="./assets/delete.svg" className="icon"></img>
            </button>
            <div className="filter-types">
              <div className="in-depth">
                <h2>Depth:&nbsp;&nbsp;</h2>
                <input
                  type="number"
                  value={depth}
                  onChange={(e) => {
                    setDepth(e.target.value);
                  }}
                  name="text"
                  className="input-depth"
                ></input>
                &nbsp;&nbsp;
              </div>
              <div className="in-depth">
                <h2>Only in Title:&nbsp;</h2>
                <label className="cyberpunk-checkbox-label">
                  <input
                    type="checkbox"
                    className="cyberpunk-checkbox"
                    checked={absolute}
                    onChange={(e) => setAbsolute(e.target.checked)}
                  ></input>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  } else if (searchingStatus === "searching") {
    return (
      <div className="container">
        <Loading />
        <div className="header-r">
          <h2>Searching For : {input}</h2>
        </div>
        <PushButton label={"Terminate"} onClick={resetSearch} />
      </div>
    );
  } else if (searchingStatus === "searched") {
    return (
      <div className="container">
        <div className="header-r">
          <h2>Keyword : {input}</h2>
          <PushButton label={"Reset"} onClick={resetSearch} />
          <button
            className="m-button sort-btn"
            onClick={() => setSortOpen(!sortOpen)}
          >
            <img
              alt=""
              src="./assets/sort.svg"
              className="btn-icon"
              style={{ width: 20, height: 20 }}
            ></img>
          </button>
          <ul id="sort-menu" className="f-menu">
            <li className={titleSortClass}>
              <button onClick={() => updateSortBy("name")}>Title</button>
            </li>
            <li className={pageSortClass}>
              <button onClick={() => updateSortBy("page")}>Depth</button>
            </li>
          </ul>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {results.map((item, index) => (
            <WSearchCard key={index} webtoon={item} loadCovers={loadCovers} />
          ))}
        </div>
      </div>
    );
  } else {
    return <></>;
  }
}
