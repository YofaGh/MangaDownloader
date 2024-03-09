import { DCard } from ".";
import { invoke } from "@tauri-apps/api/tauri";

export default function Downloaded({ downloaded, addDownloadedMessage }) {
  const removeWebtoon = (index) => {
    addDownloadedMessage({ removeWebtoon: { index } });
  };
  const removeAllWebtoons = () => {
    addDownloadedMessage({ removeAllWebtoons: {} });
  };
  const deleteAllWebtoons = () => {
    downloaded.forEach((webtoon) => {
      invoke("remove_directory", { path: webtoon.path, recursive: true });
    });
    addDownloadedMessage({ removeAllWebtoons: {} });
  };
  return downloaded.length !== 0 ? (
    <div className="queue-div">
      <div className="manage">
        <div className="info-manage">Number of Items: {downloaded.length}</div>
        <div className="manage-btn">
          <button className="buttong" onClick={removeAllWebtoons}>
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
                  removeWebtoon={() => removeWebtoon(index)}
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
