import { useState } from "react";
import {
  SearchBar,
  SearchFilter,
  FilterButton,
  WSearchCard,
  PushButton,
  ExpandButton
} from "../components";
import { useSettingsStore, useSearchStore, useModulesStore } from "../store";
import { invoke } from "@tauri-apps/api/core";
import { listen, once } from "@tauri-apps/api/event";

export default function Search() {
  const modules = useModulesStore((state) => state.modules);
  const { default_search_depth, load_covers, sleep_time } = useSettingsStore(
    (state) => state.settings
  );
  const [sortBy, setSortBy] = useState("");
  const {
    searchResults,
    searchStatus,
    searchKeyword,
    searchDepth,
    setSearchDepth,
    searchAbsolute,
    selectedSearchModules,
    setSearching,
    doneSearching,
    setSearchKeyword,
    addSearchResult,
    setSelectedSearchModules,
    clearSearch,
    searchModuleTypes,
  } = useSearchStore();
  if (searchDepth === 0) setSearchDepth(default_search_depth);

  const updateSortBy = (newSortBy) => {
    setSortBy(newSortBy);
    searchResults.sort(function (a, b) {
      if (a[newSortBy] < b[newSortBy]) return -1;
      if (a[newSortBy] > b[newSortBy]) return 1;
      return 0;
    });
    toggleSortMenu();
  };

  const toggleSortMenu = async () => {
    const sortMenu = document.getElementById("sort-menu");
    sortMenu.style.opacity = sortMenu.style.opacity === "1" ? "0" : "1";
  };

  const resetSearch = async () => {
    await invoke("stop_search");
    clearSearch();
  };

  const startSearching = async () => {
    clearSearch();
    const selectedSearchModulesr = modules
      .filter(
        (module) =>
          searchModuleTypes.some(
            (type) => type.name === module.type && type.selected
          ) &&
          module.searchable &&
          module.selected
      )
      .map((item) => item.domain);
    setSearchKeyword(searchKeyword);
    setSelectedSearchModules(selectedSearchModulesr);
    setSearching(selectedSearchModulesr[0]);
    invoke("search_keyword", {
      modules: selectedSearchModulesr,
      keyword: searchKeyword,
      sleepTime: sleep_time,
      depth: searchDepth,
      absolute: searchAbsolute,
    });
    await once("doneSearching", () => {
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
    document.getElementById("myModal").style.display = isShow
      ? "block"
      : "none";
  };

  window.addEventListener("click", (event) => {
    event.target === document.getElementById("myModal") && showHideModal(false);
  });

  let titleSortClass = `f-menu-item ${sortBy === "name" ? "selected" : ""}`;
  let pageSortClass = `f-menu-item ${sortBy === "page" ? "selected" : ""}`;

  if (searchStatus.init) {
    return (
      <div className="container">
        <div style={{ display: "flex" }}>
          <ExpandButton name="filter" dimension={20} onClick={() => showHideModal(true)} />
          <SearchBar input={searchKeyword} setInput={setSearchKeyword} />
          <ExpandButton name="search" dimension={20} onClick={startSearching} />
        </div>
        <SearchFilter showHideModal={showHideModal} />
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
              (result) => result.domain === item
            ).length;
            num = num === 0 ? "" : num;
            return (
              <FilterButton
                key={item}
                label={`${item}  ${num}`}
                selected={searchResults.some(
                  (result) => result.domain === item
                )}
                loading={searchStatus.searching === item}
              />
            );
          })}
        </div>
      </div>
    );
  } else if (searchStatus.searched) {
    return (
      <div className="container">
        <div className="header-r">
          <h2>Keyword : {searchKeyword}</h2>
          <PushButton label={"Reset"} onClick={resetSearch} />
          <ExpandButton name="sort" dimension={20} onClick={toggleSortMenu} />
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
                key={item}
                label={`${item} ${
                  searchResults.filter((result) => result.domain === item)
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
  }
  return <div className="container"></div>;
}
