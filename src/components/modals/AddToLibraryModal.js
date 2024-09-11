import { useState } from "react";
import { PushButton, Icon } from "..";
import { showHideModal } from "../../utils";
import { useLibraryStore, useNotificationStore } from "../../store";

export default function AddToLibraryModal({ webtoon, domain, url }) {
  const [error, setError] = useState(null);
  const [title, setTitle] = useState(webtoon.Title);
  const { library, addToLibrary } = useLibraryStore();
  const addSuccessNotification = useNotificationStore(
    (state) => state.addSuccessNotification
  );

  const handleAddMangaToLibrary = () => {
    if (library.some((manga) => manga.title === title) || !title) {
      setError(
        title
          ? "A manga with this title is already in your library."
          : "Enter a valid name."
      );
      return;
    }
    addToLibrary({
      title,
      id: `${domain}_$_${url}`,
      enabled: true,
      domain,
      url,
      cover: webtoon.Cover,
      last_downloaded_chapter: null,
    });
    addSuccessNotification(`Added ${title} to library`);
    showHideModal("lib-modal", false);
  };

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
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        ></input>
        <PushButton label="Ok" onClick={handleAddMangaToLibrary} />
        <PushButton
          label="Cancel"
          onClick={() => showHideModal("lib-modal", false)}
        />
        <br />
        {error && <span className="error-message">{error}</span>}
      </div>
    </div>
  );
}
