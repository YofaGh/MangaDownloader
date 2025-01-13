import { DCard, ActionButton } from ".";
import { attemptToDownload } from "../operators";
import { useDownloadedStore, useQueueStore } from "../store";
import { removeDirectory, WebtoonType, DownloadStatus } from "../utils";

export default function Downloaded() {
  const { downloaded, removeFromDownloaded, removeAllDownloaded } =
    useDownloadedStore();
  const addToQueue = useQueueStore((state) => state.addToQueue);

  const deleteAllWebtoons = () => {
    downloaded.forEach((webtoon) => removeDirectory(webtoon.path, true));
    removeAllDownloaded();
  };

  const deleteFolder = (webtoon) => {
    removeDirectory(webtoon.path, true);
    removeFromDownloaded(webtoon.id);
  };

  const restart = (webtoon) => {
    let info =
      webtoon.type === WebtoonType.MANGA
        ? {
            manga: webtoon.manga,
            info: webtoon.info,
            chapter: webtoon.chapter,
          }
        : { doujin: webtoon.doujin, info: webtoon.doujin };
    removeFromDownloaded(webtoon.id);
    addToQueue({
      type: webtoon.type,
      id: webtoon.id,
      title: webtoon.title,
      module: webtoon.module,
      status: DownloadStatus.STARTED,
      ...info,
    });
    attemptToDownload();
  };

  if (downloaded.length === 0) {
    return (
      <div className="manage">
        <div className="info-manage">Number of Items: 0</div>
      </div>
    );
  }
  return (
    <div>
      <div className="manage">
        <div className="info-manage">Number of Items: {downloaded.length}</div>
        <div className="manage-btn">
          <ActionButton
            svgName="delete"
            onClick={removeAllDownloaded}
            tooltip="Remove All from List"
          />
          <ActionButton
            svgName="trash"
            tooltip="Delete All"
            onClick={deleteAllWebtoons}
          />
        </div>
      </div>
      <div className="queue-list">
        <ul className="ul-queue">
          {downloaded.map((webtoon, index) => (
            <li key={webtoon.id}>
              <DCard
                index={index}
                webtoon={webtoon}
                deleteFolder={deleteFolder}
                removeWebtoon={removeFromDownloaded}
                restart={restart}
              />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
