import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSettingsStore } from "../store";
import { searchByKeyword, toggleModal } from "../utils";
import {
  Loading,
  SearchBar,
  PushButton,
  WSearchCard,
  ExpandButton,
  ModuleSearchModal,
} from "../components";

export default function Module() {
  const { default_search_depth, sleep_time } = useSettingsStore(
    (state) => state.settings
  );
  const [input, setInput] = useState("");
  const [sortBy, setSortBy] = useState("");
  const [results, setResults] = useState([]);
  const [absolute, setAbsolute] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [depth, setDepth] = useState(default_search_depth);
  const [searchingStatus, setSearchingStatus] = useState(null);
  const { is_coded, is_searchable, domain } = useLocation().state.module;

  const startSearching = async () => {
    setSearchingStatus("searching");
    const response = await searchByKeyword(
      domain,
      input,
      sleep_time,
      depth,
      absolute
    );
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
            onClick={() => toggleModal("mod-Modal", true)}
          />
          <SearchBar
            input={input}
            setInput={setInput}
            placeHolder={`Search anything or Enter Webtoon URL ${
              is_coded ? "or Enter Doujin Code" : ""
            }`}
          />
          <Link to={`/${domain}/webtoon/${input}`}>
            <ExpandButton name="goto" dimension={20} />
          </Link>
          {is_searchable && (
            <ExpandButton
              name="search"
              dimension={20}
              onClick={startSearching}
            />
          )}
        </div>
        <ModuleSearchModal
          depth={depth}
          absolute={absolute}
          setDepth={setDepth}
          setAbsolute={setAbsolute}
        />
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
            flexWrap: "wrap",
            flexDirection: "row",
            justifyContent: "center",
          }}
        >
          {results.map((item, index) => (
            <WSearchCard key={index} webtoon={item} />
          ))}
        </div>
      </div>
    );
  }
}
