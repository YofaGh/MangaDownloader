import { useState, useEffect } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import {
  SearchBar,
  CheckBox,
  PushButton,
  ExpandButton,
  WSearchCard,
  Loading,
} from "../components";
import { useSettingsStore } from "../store";
import { invoke } from "@tauri-apps/api/core";

export default function Module() {
  const { module } = useParams();
  const { default_search_depth, sleep_time, load_covers } = useSettingsStore(
    (state) => state.settings
  );
  const [input, setInput] = useState("");
  const [absolute, setAbsolute] = useState(false);
  const [results, setResults] = useState([]);
  const [depth, setDepth] = useState(default_search_depth);
  const [searchingStatus, setSearchingStatus] = useState(null);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState("");
  const moduleDetm = useLocation().state.module;

  const showHideModal = (isShow) => {
    const modal = document.getElementById("mod-Modal");
    modal.style.display = isShow ? "block" : "none";
  };

  const startSearching = async () => {
    setSearchingStatus("searching");
    const response = await invoke("search_keyword_one", {
      module,
      keyword: input,
      sleepTime: sleep_time,
      depth,
      absolute,
    });
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
          <ExpandButton
            name="filter"
            dimension={20}
            onClick={() => showHideModal(true)}
          />
          <SearchBar
            input={input}
            setInput={setInput}
            placeHolder={`Search anything or Enter Webtoon URL ${
              moduleDetm.is_coded ? "or Enter Doujin Code" : ""
            }`}
          />
          <Link to={`/${module}/webtoon/${input}`}>
            <ExpandButton name="goto" dimension={20} />
          </Link>
          {moduleDetm.searchable && (
            <ExpandButton
              name="search"
              dimension={20}
              onClick={startSearching}
            />
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
                  onChange={(e) => setDepth(e.target.value)}
                  name="text"
                  className="input-depth"
                ></input>
                &nbsp;&nbsp;
              </div>
              <div className="in-depth">
                <CheckBox
                  label=<h2>Only in Title:</h2>
                  checked={absolute}
                  onChange={(e) => setAbsolute(e.target.checked)}
                />
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
        <PushButton label="Terminate" onClick={resetSearch} />
      </div>
    );
  } else if (searchingStatus === "searched") {
    return (
      <div className="container">
        <div className="header-r">
          <h2>Keyword : {input}</h2>
          <PushButton label="Reset" onClick={resetSearch} />
          <ExpandButton
            name="sort"
            dimension={20}
            onClick={() => setSortOpen(!sortOpen)}
          />
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
            <WSearchCard key={index} webtoon={item} load_covers={load_covers} />
          ))}
        </div>
      </div>
    );
  } else {
    return <></>;
  }
}
