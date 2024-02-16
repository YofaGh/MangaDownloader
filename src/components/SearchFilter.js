import React from "react";
import "../styles/SearchFilter.css";
import FilterToggleButton from "./FilterToggleButton";
import PushButton from "./PushButton";

export default function SearchFilter({
  types,
  updateTypes,
  modules,
  updateModules,
  showHideModal,
  depth,
  setDepth,
  absolute,
  setAbsolute,
}) {
  const setTypes = (index, checked) => {
    const newTypes = [...types];
    newTypes[index].selected = checked;
    updateTypes(newTypes);
  };

  const checkAllModules = (checked) => {
    const newModules = modules.map((module) => {
      module.selected = checked;
      return module;
    });
    updateModules(newModules);
  };

  const setModules = (moduleName, checked) => {
    const updatedModules = [...modules];
    const index = updatedModules.findIndex(
      (module) => module.name === moduleName
    );
    updatedModules[index].selected = checked;
    updateModules(updatedModules);
  };

  return (
    <div id="myModal" className="modal">
      <div className="modal-content">
        <button
          className="buttonh closeBtn"
          onClick={() => showHideModal(false)}
        >
          <img alt="" src="./assets/delete.svg" className="icon"></img>
        </button>
        <div className="filter-types">
          <h2>Type:&nbsp;</h2>
          {types.map((type, index) => (
            <FilterToggleButton
              key={type.name}
              label={type.name}
              selected={type.selected}
              onChange={(e) => setTypes(index, e.target.checked)}
            />
          ))}
          &nbsp;&nbsp;
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
        <div className="filter-types align-center">
          <h2>Modules</h2>
          <PushButton
            label={"Check All"}
            onClick={() => checkAllModules(true)}
          />
          <PushButton
            label={"Uncheck All"}
            onClick={() => checkAllModules(false)}
          />
        </div>
        <div className="filter-types">
          {modules
            .filter((module) =>
              types.some((type) => type.name === module.type && type.selected)
            )
            .map((module) => (
              <FilterToggleButton
                key={module.name}
                label={module.name}
                selected={module.selected}
                onChange={(e) => setModules(module.name, e.target.checked)}
              />
            ))}
        </div>
      </div>
    </div>
  );
}
