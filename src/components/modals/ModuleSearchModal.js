import { CheckBox, Icon } from "..";
import { showHideModal } from "../../utils";

export default function AddToLibraryModal({
  depth,
  absolute,
  setDepth,
  setAbsolute,
}) {
  return (
    <div id="mod-Modal" className="modal">
      <div className="modal-content">
        <button
          className="buttonh closeBtn"
          onClick={() => showHideModal("mod-Modal", false)}
        >
          <Icon svgName="delete" />
        </button>
        <div className="filter-types">
          <div className="in-depth">
            <h2>Depth:&nbsp;&nbsp;</h2>
            <input
              name="text"
              type="number"
              value={depth}
              className="input-depth"
              onChange={(e) => setDepth(e.target.value)}
            ></input>
            &nbsp;&nbsp;
          </div>
          <div className="in-depth">
            <CheckBox
              checked={absolute}
              label=<h2>Only in Title:</h2>
              onChange={(e) => setAbsolute(e.target.checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
