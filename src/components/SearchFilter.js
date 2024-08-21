import { FilterToggleButton, PushButton } from ".";
import { useSearchStore, useModulesStore } from "../store";

export default function SearchFilter({ showHideModal }) {
  const {
    searchModuleTypes,
    updateSearchModuleTypeByIndex,
    searchAbsolute,
    setSearchAbsolute,
    searchDepth,
    setSearchDepth,
  } = useSearchStore();
  const { modules, updateModuleSelected, updateModulesSelected } =
    useModulesStore();

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
          {searchModuleTypes.map((type, index) => (
            <FilterToggleButton
              key={type.name}
              label={type.name}
              selected={type.selected}
              onChange={(e) =>
                updateSearchModuleTypeByIndex(index, e.target.checked)
              }
            />
          ))}
          &nbsp;&nbsp;
          <div className="in-depth">
            <h2>Depth:&nbsp;&nbsp;</h2>
            <input
              type="number"
              value={searchDepth}
              onChange={(e) => {
                setSearchDepth(Number(e.target.value));
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
                checked={searchAbsolute}
                onChange={(e) => setSearchAbsolute(e.target.checked)}
              ></input>
            </label>
          </div>
        </div>
        <div className="filter-types align-center">
          <h2>Modules</h2>
          <PushButton
            label={"Check All"}
            onClick={() => updateModulesSelected(true)}
          />
          <PushButton
            label={"Uncheck All"}
            onClick={() => updateModulesSelected(false)}
          />
        </div>
        <div className="filter-types">
          {modules
            .filter((module) => module.searchable)
            .filter((module) =>
              searchModuleTypes.some(
                (type) => type.name === module.type && type.selected
              )
            )
            .map((module) => (
              <FilterToggleButton
                key={module.name}
                label={module.name}
                selected={module.selected}
                onChange={(e) =>
                  updateModuleSelected(module.name, e.target.checked)
                }
              />
            ))}
        </div>
      </div>
    </div>
  );
}
