import { useState, useEffect } from "react";
import {
  SearchBar,
  SearchFilter,
  FilterButton,
  WSearchCard,
  PushButton,
} from "../components";
import { useSheller, useSettings } from "../Provider";

export default function Search({
  startSearching,
  searchingStatus,
  searchResults,
  resetSearch,
  selectedModulesForSearch,
  searchKeyword,
}) {
  const [input, setInput] = useState("");
  const [types, updateTypes] = useState([
    { name: "Manga", selected: true },
    { name: "Doujin", selected: true },
  ]);
  const [modules, updateModules] = useState([]);
  const { default_search_depth, load_covers } = useSettings();
  const [depth, setDepth] = useState(default_search_depth);
  const [absolute, setAbsolute] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const [sortBy, setSortBy] = useState("");
  const sheller = useSheller();

  useEffect(() => {
    const fetchModules = async () => {
      const response = await sheller(["get_modules"]);
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
  }, [sheller]);

  useEffect(() => {
    if (searchingStatus && searchingStatus.searched) {
      const sortMenu = document.getElementById("sort-menu");
      sortMenu.style.opacity = sortOpen ? "1" : "0";
    }
  }, [sortOpen, searchingStatus]);

  const updateSortBy = (newSortBy) => {
    setSortBy(newSortBy);
    searchResults.sort(function (a, b) {
      if (a[newSortBy] < b[newSortBy]) return -1;
      if (a[newSortBy] > b[newSortBy]) return 1;
      return 0;
    });
    setSortOpen(!sortOpen);
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
  } else if (searchingStatus.searching) {
    return (
      <div className="container">
        <div className="header-r">
          <h2>Searching For : {searchKeyword}</h2>
          <PushButton label={"Terminate"} onClick={resetSearch} />
        </div>
        <div className="s-cont">
          {selectedModulesForSearch.map((item) => {
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
                loading={searchingStatus.searching.module === item.name}
              />
            );
          })}
        </div>
      </div>
    );
  } else if (searchingStatus === "searched") {
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
          {selectedModulesForSearch.map((item) => {
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
