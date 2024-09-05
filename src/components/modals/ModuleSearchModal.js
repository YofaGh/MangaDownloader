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
              type="number"
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              name="text"
              className="input-depth"
            ></input>
            &nbsp;&nbsp;
          </div>
          <div className="in-depth">
            <CheckBox
              label=<h2>Only in Title:</h2>
              checked={absolute}
              onChange={(e) => setAbsolute(e.target.checked)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
