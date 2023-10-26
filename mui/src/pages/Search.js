import React, { useState, useEffect } from "react";
import SearchBar from "../components/SearchBar";
import get_modules from "../api/get_modules";
import SearchFilter from "../components/SearchFilter";
import FilterButton from "../components/FilterButton";
import WSearchCard from "../components/WSearchCard";
import CrushedButton from "../components/CrushedButton";
import "../styles/Search.css";

function Search({
  startSearching,
  searchingStatus,
  searchResults,
  resetSearch,
  selectedModulesForSearch,
}) {
  const [input, setInput] = useState("");
  const [types, updateTypes] = useState([
    { name: "Manga", selected: true },
    { name: "Doujin", selected: true },
  ]);
  const [modules, updateModules] = useState([]);
  const [depth, setDepth] = useState(3);
  const [absolute, setAbsolute] = useState(false);
  const fetchModules = async () => {
    const response = await get_modules();
    updateModules(
      response.map((module) => {
        const item = { ...module };
        item.name = item.domain;
        delete item.domain;
        item.selected = true;
        return item;
      })
    );
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const showHideModal = (isShow) => {
    const modal = document.getElementById("myModal");
    modal.style.display = isShow ? "block" : "none";
  };

  window.addEventListener("click", (event) => {
    event.target === document.getElementById("myModal") && showHideModal(false);
  });

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
          <h2>Searching For : {searchingStatus.searching.keyword}</h2>
          <CrushedButton label={"Terminate"} onClick={resetSearch} />
        </div>
        <div
          style={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}
        >
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
  } else if (searchingStatus.searched) {
    return (
      <div className="container">
        <div className="header-r">
          <h2>Keyword : {searchingStatus.searched.keyword}</h2>
          <CrushedButton label={"Reset"} onClick={resetSearch} />
        </div>
        <div
          style={{ display: "flex", flexDirection: "row", flexWrap: "wrap" }}
        >
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
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          {searchResults.map((item, index) => (
            <WSearchCard key={index} webtoon={item} />
          ))}
        </div>
      </div>
    );
  } else {
    return <div className="container"></div>;
  }
}

export default Search;
