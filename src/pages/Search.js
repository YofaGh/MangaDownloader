import { useState, useEffect } from "react";
import {
  SearchBar,
  SearchFilter,
  FilterButton,
  WSearchCard,
  PushButton,
} from "../components";
import { useSettingsStore, useSearchStore } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

export default function Search() {
  const [input, setInput] = useState("");
  const [types, updateTypes] = useState([
    { name: "Manga", selected: true },
    { name: "Doujin", selected: true },
  ]);
  const [modules, updateModules] = useState([]);
  const { default_search_depth, load_covers, sleep_time } =
    useSettingsStore((state) => state.settings);
  const [depth, setDepth] = useState(default_search_depth);
  const [absolute, setAbsolute] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState("");
  const {
    searchResults,
    searchStatus,
    searchKeyword,
    selectedSearchModules,
    setSearching,
    doneSearching,
    setSearchKeyword,
    addSearchResult,
    setSelectedSearchModules,
    clearSearch,
  } = useSearchStore();

  useEffect(() => {
    const fetchModules = async () => {
      const response = await invoke("get_modules");
      updateModules(
        response
          .filter((module) => module.searchable)
          .map((module) => {
            const item = { ...module };
            item.name = item.domain;
            delete item.domain;
            item.selected = true;
            return item;
          })
      );
    };

    fetchModules();
  }, []);

  useEffect(() => {
    if (searchStatus && searchStatus.searched) {
      const sortMenu = document.getElementById("sort-menu");
      sortMenu.style.opacity = sortOpen ? "1" : "0";
    }
  }, [sortOpen, searchStatus]);

  const updateSortBy = (newSortBy) => {
    setSortBy(newSortBy);
    searchResults.sort(function (a, b) {
      if (a[newSortBy] < b[newSortBy]) return -1;
      if (a[newSortBy] > b[newSortBy]) return 1;
      return 0;
    });
    setSortOpen(!sortOpen);
  };

  const resetSearch = async () => {
    await invoke("stop_search");
    clearSearch();
  };

  const startSearching = async (modules, keyword, depth, absolute) => {
    clearSearch();
    setSearchKeyword(keyword);
    setSelectedSearchModules(modules);
    setSearching(modules[0].name);
    invoke("search_keyword", {
      modules: modules.map((item) => item.name),
      keyword,
      sleepTime: sleep_time,
      depth: depth,
      absolute: absolute,
    });
    await listen("doneSearching", () => {
      doneSearching();
    });
    await listen("searchingModule", (event) => {
      setSearching(event.payload.module);
    });
    await listen("searchedModule", (event) => {
      addSearchResult(event.payload.result);
    });
  };

  const showHideModal = (isShow) => {
    const modal = document.getElementById("myModal");
    modal.style.display = isShow ? "block" : "none";
  };

  window.addEventListener("click", (event) => {
    event.target === document.getElementById("myModal") && showHideModal(false);
  });

  let titleSortClass = `f-menu-item ${sortBy === "name" ? "selected" : ""}`;
  let pageSortClass = `f-menu-item ${sortBy === "page" ? "selected" : ""}`;

  if (searchStatus.status === null) {
    return (
      <div className="container">
        <div style={{ display: "flex" }}>
          <button
            className="m-button filter-btn"
            onClick={() => showHideModal(true)}
          >
            <img alt="" src="./assets/filter.svg" className="btn-icon"></img>
          </button>
          <SearchBar input={input} setInput={setInput} />
          <button
            className="m-button search-btn"
            onClick={() => {
              startSearching(
                modules
                  .filter((module) =>
                    types.some(
                      (type) => type.name === module.type && type.selected
                    )
                  )
                  .filter((item) => item.selected),
                input,
                depth,
                absolute
              );
            }}
          >
            <img
              alt=""
              src="./assets/search.svg"
              className="btn-icon"
              style={{ width: 20, height: 20 }}
            ></img>
          </button>
        </div>
        <SearchFilter
          types={types}
          updateTypes={updateTypes}
          modules={modules}
          updateModules={updateModules}
          showHideModal={showHideModal}
          depth={depth}
          setDepth={setDepth}
          absolute={absolute}
          setAbsolute={setAbsolute}
        />
      </div>
    );
  } else if (searchStatus.searching) {
    return (
      <div className="container">
        <div className="header-r">
          <h2>Searching For : {searchKeyword}</h2>
          <PushButton label={"Terminate"} onClick={resetSearch} />
        </div>
        <div className="s-cont">
          {selectedSearchModules.map((item) => {
            let num = searchResults.filter(
              (result) => result.domain === item.name
            ).length;
            num = num === 0 ? "" : num;
            return (
              <FilterButton
                key={item.name}
                label={`${item.name}  ${num}`}
                selected={searchResults.some(
                  (result) => result.domain === item.name
                )}
                loading={searchStatus.searching.module === item.name}
              />
            );
          })}
        </div>
      </div>
    );
  } else if (searchStatus.status === "searched") {
    return (
      <div className="container">
        <div className="header-r">
          <h2>Keyword : {searchKeyword}</h2>
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
        <div className="s-cont">
          {selectedSearchModules.map((item) => {
            return (
              <FilterButton
                key={item.name}
                label={`${item.name} ${
                  searchResults.filter((result) => result.domain === item.name)
                    .length
                }`}
                selected={true}
                loading={false}
              />
            );
          })}
        </div>
        <br />
        <div className="s-cont">
          {searchResults.map((item, index) => (
            <WSearchCard key={index} webtoon={item} load_covers={load_covers} />
          ))}
        </div>
      </div>
    );
  } else {
    return <div className="container"></div>;
  }
}
