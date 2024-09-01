import { PushButton, StepsCircle } from "..";
import { WebtoonType, showHideModal } from "../../utils";

export default function ModuleCheckerModal({
  module,
  checkModule,
  stepStatuses,
}) {
  const circles = [
    {
      id: "checkImage",
      name: "Getting Images",
    },
    {
      id: "checkDownloadImage",
      name: "Downloading an Image",
    },
  ];
  if (module.type === WebtoonType.MANGA)
    circles.unshift({ id: "checkChapter", name: "Getting Chapters" });
  if (module.searchable)
    circles.push({ id: "checkSearch", name: "Searching In Module" });
  return (
    <div id="checkModal" className="modal">
      <div className="modal-content">
        <button
          className="buttonh closeBtn"
          onClick={() => showHideModal("checkModal", false)}
        >
          <img alt="" src="./assets/delete.svg" className="icon"></img>
        </button>
        <div className="ch-steps-header">
          <h3>Checking Module: {module.domain}</h3>
        </div>
        <StepsCircle
          circles={circles}
          preClassName="ch-"
          stepStatuses={stepStatuses}
        />
        <PushButton label="Try Again" onClick={() => checkModule(module)} />
        <PushButton
          label="Ok"
          onClick={() => showHideModal("checkModal", false)}
        />
      </div>
    </div>
  );
}
