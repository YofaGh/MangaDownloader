import { useEffect, useState } from "react";
import { showHideModal } from "../utils";
import { useModulesStore } from "../store";
import { MCard, ModuleCheckerModal } from "../components";

export default function Modules() {
  const [stepStatuses, setStepStatuses] = useState([]);
  const [moduleToCheck, setModuleToCheck] = useState([]);

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
            module={module}
            key={module.domain}
            setStepStatuses={setStepStatuses}
            setModuleToCheck={setModuleToCheck}
          />
        ))}
      </div>
      <ModuleCheckerModal
        stepStatuses={stepStatuses}
        moduleToCheck={moduleToCheck}
        setStepStatuses={setStepStatuses}
      />
    </div>
  );
}
