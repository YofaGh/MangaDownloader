import { DCard } from ".";
import { invoke } from "@tauri-apps/api/core";
import { useDownloadedStore } from "../store";

export default function Downloaded() {
  const { downloaded, deleteDownloadedByIndex, deleteAllDownloaded } = useDownloadedStore();

  const deleteAllWebtoons = () => {
    downloaded.forEach((webtoon) => {
      invoke("remove_directory", { path: webtoon.path, recursive: true });
    });
    deleteAllDownloaded();
  };
  return downloaded.length !== 0 ? (
    <div className="queue-div">
      <div className="manage">
        <div className="info-manage">Number of Items: {downloaded.length}</div>
        <div className="manage-btn">
          <button className="buttong" onClick={deleteAllDownloaded}>
            <img alt="" src="./assets/delete.svg" className="icon"></img>
            <span className="tooltip">Remove All from List</span>
          </button>
          <button className="buttong" onClick={deleteAllWebtoons}>
            <img alt="" src="./assets/trash.svg" className="icon"></img>
            <span className="tooltip">Delete All</span>
          </button>
        </div>
      </div>
      <div className="queue-list">
        <ul className="ul-queue">
          {downloaded.map((webtoon, index) => {
            return (
              <li key={webtoon.id}>
                <DCard
                  webtoon={webtoon}
                  removeWebtoon={() => deleteDownloadedByIndex(index)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  ) : (
    <div className="no-info">
      <h2>There are no downloaded webtoons</h2>
    </div>
  );
}
