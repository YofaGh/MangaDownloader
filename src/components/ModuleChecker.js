import { PushButton } from ".";

export default function ModuleChecker({ module, showHideModal, checkModule }) {
  return (
    <div id="checkModal" className="modal ch-modal">
      <div className="modal-content">
        <button className="buttonh closeBtn" onClick={() => showHideModal(false)}>
          <img alt="" src="./assets/delete.svg" className="icon"></img>
        </button>
        <div className="ch-steps-header">
          <h3>Checking Module: {module.domain}</h3>
        </div>
        {module.type === "Manga" && (
          <div className="ch-steps-container">
            <div className="ch-steps">
              <span className="ch-steps-circle" id="checkChapter">
                Getting Chapters
              </span>
              <span className="ch-steps-circle" id="checkImage">
                Getting Images
              </span>
              <span className="ch-steps-circle" id="checkDownloadImage">
                Downloading an Image
              </span>
              {module.searchable && (
                <span className="ch-steps-circle" id="checkSearch">
                  Searching In Module
                </span>
              )}
            </div>
          </div>
        )}
        {module.type === "Doujin" && (
          <div className="ch-steps-container">
            <div className="ch-steps">
              <span className="ch-steps-circle" id="checkTitle">
                Getting Title
              </span>
              <span className="ch-steps-circle" id="checkImage">
                Getting Images
              </span>
              <span className="ch-steps-circle" id="checkDownloadImage">
                Downloading an Image
              </span>
              {module.searchable && (
                <span className="ch-steps-circle" id="checkSearch">
                  Searching in Module
                </span>
              )}
            </div>
          </div>
        )}
        <PushButton label={"Try Again"} onClick={() => checkModule(module)} />
        <PushButton label={"Ok"} onClick={() => showHideModal(false)} />
      </div>
    </div>
  );
}
