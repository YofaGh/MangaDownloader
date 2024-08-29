import { invoke } from "@tauri-apps/api/core";
import { DCard, ActionButtonBig } from ".";
import { useDownloadedStore } from "../store";

export default function Downloaded() {
  const { downloaded, deleteDownloadedByIndex, deleteAllDownloaded } =
    useDownloadedStore();

  const deleteAllWebtoons = () => {
    downloaded.forEach((webtoon) =>
      invoke("remove_directory", { path: webtoon.path, recursive: true })
    );
    deleteAllDownloaded();
  };

  const deleteFolder = (path, index) => {
    invoke("remove_directory", { path, recursive: true });
    deleteDownloadedByIndex(index);
  };

  if (downloaded.length === 0) {
    return (
      <div className="queue-div">
        <div className="manage">
          <div className="info-manage">Number of Items: 0</div>
        </div>
      </div>
    );
  }
  return (
    <div className="queue-div">
      <div className="manage">
        <div className="info-manage">Number of Items: {downloaded.length}</div>
        <div className="manage-btn">
          <ActionButtonBig
            tooltip="Remove All from List"
            svgName="delete"
            onClick={deleteAllDownloaded}
          />
          <ActionButtonBig
            tooltip="Delete All"
            svgName="trash"
            onClick={deleteAllWebtoons}
          />
        </div>
      </div>
      <div className="queue-list">
        <ul className="ul-queue">
          {downloaded.map((webtoon, index) => (
            <li key={webtoon.id}>
              <DCard
                webtoon={webtoon}
                index={index}
                removeWebtoon={deleteDownloadedByIndex}
                deleteFolder={deleteFolder}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
