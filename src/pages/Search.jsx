import { useState, useEffect } from "react";
import { searcher } from "../operators";
import { toggleModal } from "../utils";
import { useSettingsStore, useSearchStore } from "../store";
import {
  SearchBar,
  PushButton,
  WSearchCard,
  FilterButton,
  ExpandButton,
  SearchFilterModal,
} from "../components";

export default function Search() {
  const [sortBy, setSortBy] = useState("");
  const { default_search_depth } = useSettingsStore((state) => state.settings);
  const {
    clearSearch,
    searchDepth,
    searchStatus,
    searchResults,
    searchKeyword,
    setSearchDepth,
    setSearchKeyword,
    setStopRequested,
    selectedSearchModules,
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

  const toggleSortMenu = () => {
    const sortMenu = document.getElementById("sort-menu");
    sortMenu.style.opacity = sortMenu.style.opacity === "1" ? "0" : "1";
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target === document.getElementById("myModal"))
        toggleModal("myModal", false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  let titleSortClass = `f-menu-item ${sortBy === "name" ? "selected" : ""}`;
  let pageSortClass = `f-menu-item ${sortBy === "page" ? "selected" : ""}`;

  if (searchStatus.init) {
    return (
      <div className="container">
        <div className="display-inline-flex">
          <ExpandButton
            name="filter"
            dimension={20}
            onClick={() => toggleModal("myModal", true)}
          />
          <SearchBar input={searchKeyword} setInput={setSearchKeyword} />
          <ExpandButton
            name="search"
            dimension={20}
            onClick={() => {
              setStopRequested(false);
              searcher();
            }}
          />
        </div>
        <SearchFilterModal />
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
              loading={searchStatus.searching === item}
              selected={searchResults.some(({ domain }) => domain === item)}
              label={`${item}  ${
                searchResults.filter((result) => result.domain === item)
                  .length || ""
              }`}
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
              selected={true}
              loading={false}
              label={`${item} ${
                searchResults.filter(({ domain }) => domain === item).length
              }`}
            />
          ))}
        </div>
        <br />
        <div className="s-cont">
          {searchResults.map((item, index) => (
            <WSearchCard key={index} webtoon={item} />
          ))}
        </div>
      </div>
    );
  }
  return <div className="container"></div>;
}
