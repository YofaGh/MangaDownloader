import { moduleChecker } from "../../operators";
import { PushButton, StepsCircle, Icon } from "..";
import { WebtoonType, toggleModal } from "../../utils";

export default function ModuleCheckerModal({
  stepStatuses,
  moduleToCheck,
  setStepStatuses,
}) {
  const circles = ["Getting Images", "Downloading an Image"];
  if (moduleToCheck.type === WebtoonType.MANGA)
    circles.unshift("Getting Chapters");
  if (moduleToCheck.is_searchable) circles.push("Searching In Module");
  return (
    <div id="checkModal" className="modal">
      <div className="modal-content">
        <button
          className="buttonh closeBtn"
          onClick={() => toggleModal("checkModal", false)}
        >
          <Icon svgName="delete" />
        </button>
        <div className="steps-header">
          <h3>Checking Module: {moduleToCheck.domain}</h3>
        </div>
        <StepsCircle circles={circles} stepStatuses={stepStatuses} />
        <PushButton
          label="Try Again"
          onClick={() => moduleChecker(moduleToCheck, setStepStatuses)}
        />
        <PushButton
          label="Ok"
          onClick={() => toggleModal("checkModal", false)}
        />
      </div>
    </div>
  );
}
