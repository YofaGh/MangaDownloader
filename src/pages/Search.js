import { useState } from "react";
import {
  SearchBar,
  SearchFilter,
  FilterButton,
  WSearchCard,
  PushButton,
  ExpandButton,
} from "../components";
import { startSearching } from "../utils";
import { useSettingsStore, useSearchStore } from "../store";

export default function Search() {
  const { default_search_depth, load_covers } = useSettingsStore(
    (state) => state.settings
  );
  const [sortBy, setSortBy] = useState("");
  const {
    searchResults,
    searchStatus,
    searchKeyword,
    searchDepth,
    setSearchDepth,
    selectedSearchModules,
    setSearchKeyword,
    clearSearch,
    setStopRequested,
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
          <ExpandButton
            name="filter"
            dimension={20}
            onClick={() => showHideModal(true)}
          />
          <SearchBar input={searchKeyword} setInput={setSearchKeyword} />
          <ExpandButton
            name="search"
            dimension={20}
            onClick={() => {
              setStopRequested(false);
              startSearching();
            }}
          />
        </div>
        <SearchFilter showHideModal={showHideModal} />
      </div>
    );
  } else if (searchStatus.searching) {
    return (
      <div className="container">
        <div className="header-r">
          <h2>Searching For : {searchKeyword}</h2>
          <PushButton
            label="Terminate"
            onClick={() => {
              setStopRequested(true);
              clearSearch();
            }}
          />
        </div>
        <div className="s-cont">
          {selectedSearchModules.map((item) => (
            <FilterButton
              key={item}
              label={`${item}  ${
                searchResults.filter((result) => result.domain === item)
                  .length || ""
              }`}
              selected={searchResults.some(({ domain }) => domain === item)}
              loading={searchStatus.searching === item}
            />
          ))}
        </div>
      </div>
    );
  } else if (searchStatus.searched) {
    return (
      <div className="container">
        <div className="header-r">
          <h2>Keyword : {searchKeyword}</h2>
          <PushButton label="Reset" onClick={clearSearch} />
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
          {selectedSearchModules.map((item) => (
            <FilterButton
              key={item}
              label={`${item} ${
                searchResults.filter(({ domain }) => domain === item).length
              }`}
              selected={true}
              loading={false}
            />
          ))}
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
