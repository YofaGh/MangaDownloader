import { PushButton, StepsCircle } from ".";

export default function ModuleChecker({ module, showHideModal, checkModule }) {
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
  if (module.type === "Manga")
    circles.unshift({ id: "checkChapter", name: "Getting Chapters" });
  if (module.searchable)
    circles.push({ id: "checkSearch", name: "Searching In Module" });
  return (
    <div id="checkModal" className="modal ch-modal">
      <div className="modal-content">
        <button
          className="buttonh closeBtn"
          onClick={() => showHideModal(false)}
        >
          <img alt="" src="./assets/delete.svg" className="icon"></img>
        </button>
        <div className="ch-steps-header">
          <h3>Checking Module: {module.domain}</h3>
        </div>
        <StepsCircle
          circles={circles}
          preClassName="ch-"
          hasProgressBar={false}
        />
        <PushButton label="Try Again" onClick={() => checkModule(module)} />
        <PushButton label="Ok" onClick={() => showHideModal(false)} />
      </div>
    </div>
  );
}
