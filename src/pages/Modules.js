import { useEffect, useState } from "react";
import { useModulesStore } from "../store";
import { chunkArray, showHideModal } from "../utils";
import { MCard, ModuleCheckerModal } from "../components";

export default function Modules() {
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
