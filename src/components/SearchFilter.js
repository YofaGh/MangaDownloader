import { FilterToggleButton, PushButton, CheckBox } from ".";
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
            <CheckBox
              label=<h2>Only in Title:</h2>
              checked={searchAbsolute}
              onChange={() => (e) => setSearchAbsolute(e.target.checked)}
            />
          </div>
        </div>
        <div className="filter-types align-center">
          <h2>Modules</h2>
          <PushButton
            label="Check All"
            onClick={() => updateModulesSelected(true)}
          />
          <PushButton
            label="Uncheck All"
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
                key={module.domain}
                label={module.domain}
                selected={module.selected}
                onChange={(e) =>
                  updateModuleSelected(module.domain, e.target.checked)
                }
              />
            ))}
        </div>
      </div>
    </div>
  );
}
