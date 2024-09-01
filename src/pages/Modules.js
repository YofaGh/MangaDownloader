import { useEffect, useState } from "react";
import { MCard, ModuleCheckerModal } from "../components";
import { chunkArray, showHideModal } from "../utils";
import { useSettingsStore, useModulesStore } from "../store";

export default function Modules() {
  const { load_covers } = useSettingsStore((state) => state.settings);
  const [moduleToCheck, setModuleToCheck] = useState([]);
  const [stepStatuses, setStepStatuses] = useState([]);
  const chunkedModules = chunkArray(useModulesStore().modules, 3);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (event.target === document.getElementById("checkModal"))
        showHideModal("checkModal", false);
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, []);

  return (
    <div className="container">
      <div className="App">
        <div className="App-header">
          <h1>Modules</h1>
        </div>
      </div>
      <div className="card-row-container">
        {chunkedModules.map((chunk, index) => (
          <div key={index} className="card-row">
            {chunk.map((module) => (
              <div key={module.domain} className="card-wrapper">
                <MCard
                  module={module}
                  load_covers={load_covers}
                  setStepStatuses={setStepStatuses}
                  setModuleToCheck={setModuleToCheck}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      <ModuleCheckerModal
        moduleToCheck={moduleToCheck}
        stepStatuses={stepStatuses}
        setStepStatuses={setStepStatuses}
      />
    </div>
  );
}
