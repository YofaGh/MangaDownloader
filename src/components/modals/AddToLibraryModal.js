import { PushButton, Icon } from "..";
import { showHideModal } from "../../utils";

export default function AddToLibraryModal({
  mangaTitleForLibrary,
  setMangaTitleForLibrary,
  handleAddMangaToLibrary,
}) {
  return (
    <div id="lib-modal" className="modal">
      <div className="modal-content">
        <button
          className="buttonh closeBtn"
          onClick={() => showHideModal("lib-modal", false)}
        >
          <Icon svgName="delete" />
        </button>
        <div className="title">Add manga to library</div>
        <br />
        <div>
          Please enter a title for the manga you want to add to your library.
          <br />
          You can use the original title of the manga if there isn't any manga
          with the same title in your library.
        </div>
        <br />
        <input
          name="text"
          type="text"
          className="input"
          placeholder="Enter a title"
          value={mangaTitleForLibrary}
          onChange={(e) => setMangaTitleForLibrary(e.target.value)}
        ></input>
        <PushButton label="Ok" onClick={handleAddMangaToLibrary} />
        <PushButton
          label="Cancel"
          onClick={() => showHideModal("lib-modal", false)}
        />
        <br />
        <span id="pwmessage"></span>
      </div>
    </div>
  );
}
