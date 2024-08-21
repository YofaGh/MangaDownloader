import { DCard, ActionButtonBig, merge, convert } from ".";
import { invoke } from "@tauri-apps/api/core";
import {
  useDownloadedStore,
  useSettingsStore,
  useNotificationStore,
} from "../store";

export default function Downloaded() {
  const { downloaded, deleteDownloadedByIndex, deleteAllDownloaded } =
    useDownloadedStore();
  const { download_path, merge_method } = useSettingsStore(
    (state) => state.settings
  );
  const { addNotification } = useNotificationStore();

  const deleteAllWebtoons = () => {
    downloaded.forEach((webtoon) => {
      invoke("remove_directory", { path: webtoon.path, recursive: true });
    });
    deleteAllDownloaded();
  };

  const deleteFolder = (path, index) => {
    invoke("remove_directory", { path, recursive: true });
    deleteDownloadedByIndex(index);
  };

  const openFolder = (path) => {
    invoke("open_folder", { path });
  };

  const mergeImages = (webtoon) => {
    merge(
      webtoon,
      download_path,
      merge_method,
      true,
      addNotification,
      invoke,
      openFolder
    );
  };

  const convertImages = (webtoon) => {
    convert(webtoon, true, addNotification, invoke, openFolder);
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
          {downloaded.map((webtoon, index) => {
            return (
              <li key={webtoon.id}>
                <DCard
                  webtoon={webtoon}
                  index={index}
                  mergeImages={mergeImages}
                  convertImages={convertImages}
                  removeWebtoon={deleteDownloadedByIndex}
                  deleteFolder={deleteFolder}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
