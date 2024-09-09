import { showHideModal } from "../../utils";
import { useSearchStore, useModulesStore } from "../../store";
import { FilterToggleButton, PushButton, CheckBox, Icon } from "..";

export default function SearchFilterModal() {
  const { modules, updateModuleSelected, updateModulesSelected } =
    useModulesStore();
  const {
    searchDepth,
    setSearchDepth,
    searchAbsolute,
    searchModuleTypes,
    setSearchAbsolute,
    updateSearchModuleTypeByIndex,
  } = useSearchStore();

  return (
    <div id="myModal" className="modal">
      <div className="modal-content">
        <button
          className="buttonh closeBtn"
          onClick={() => showHideModal("myModal", false)}
        >
          <Icon svgName="delete" />
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
              name="text"
              type="number"
              value={searchDepth}
              className="input-depth"
              onChange={(e) => setSearchDepth(Number(e.target.value))}
            ></input>
            &nbsp;&nbsp;
          </div>
          <div className="in-depth">
            <CheckBox
              checked={searchAbsolute}
              label=<h2>Only in Title:</h2>
              onChange={(e) => setSearchAbsolute(e.target.checked)}
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
