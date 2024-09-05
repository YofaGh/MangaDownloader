import { moduleChecker } from "../../operators";
import { PushButton, StepsCircle, Icon } from "..";
import { WebtoonType, showHideModal } from "../../utils";


export default function ModuleCheckerModal({
  moduleToCheck,
  stepStatuses,
  setStepStatuses,
}) {
  const circles = ["Getting Images", "Downloading an Image"];
  if (moduleToCheck.type === WebtoonType.MANGA)
    circles.unshift("Getting Chapters");
  if (moduleToCheck.searchable) circles.push("Searching In Module");
  return (
    <div id="checkModal" className="modal">
      <div className="modal-content">
        <button
          className="buttonh closeBtn"
          onClick={() => showHideModal("checkModal", false)}
        >
          <Icon svgName="delete" />
        </button>
        <div className="ch-steps-header">
          <h3>Checking Module: {moduleToCheck.domain}</h3>
        </div>
        <StepsCircle
          circles={circles}
          preClassName="ch-"
          stepStatuses={stepStatuses}
        />
        <PushButton
          label="Try Again"
          onClick={() => moduleChecker(moduleToCheck, setStepStatuses)}
        />
        <PushButton
          label="Ok"
          onClick={() => showHideModal("checkModal", false)}
        />
      </div>
    </div>
  );
}
