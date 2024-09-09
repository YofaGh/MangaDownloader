import { useEffect, useState } from "react";
import { useModulesStore } from "../store";
import { showHideModal } from "../utils";
import { MCard, ModuleCheckerModal } from "../components";

export default function Modules() {
  const [moduleToCheck, setModuleToCheck] = useState([]);
  const [stepStatuses, setStepStatuses] = useState([]);

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
      <div className="f-container">
        {useModulesStore((state) => state.modules).map((module) => (
          <MCard
            key={module.domain}
            module={module}
            setStepStatuses={setStepStatuses}
            setModuleToCheck={setModuleToCheck}
          />
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
