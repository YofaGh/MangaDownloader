import { ActionButtonSmall } from "..";
import { DownloadStatus } from "../../utils";

export default function QCard({
  webtoon,
  removeWebtoonFromQueue,
  setWebtoonStatus,
}) {
  let image = webtoon.image || 0;
  let total = webtoon.total || 0;

  return (
    <div className="queue-card">
      <div className="infog">
        <div className="card-titlee">{webtoon.title}</div>
        <div className="card-info">{webtoon.info}</div>
        <div className="card-domain">{webtoon.module}</div>
      </div>
      {webtoon.status !== DownloadStatus.STOPPED && (
        <div className="statusg">
          <div className="d-status">
            {webtoon.status === DownloadStatus.STARTED
              ? `Downloading Image ${image}/${total}`
              : `Downloaded ${image}/${total} Images`}
          </div>
        </div>
      )}
      <div className="button-containerrr">
        <ActionButtonSmall
          svgName="trash"
          tooltip="Delete"
          onClick={() => removeWebtoonFromQueue(webtoon)}
        />
        <ActionButtonSmall
          svgName="stop"
          tooltip="Stop"
          onClick={() => setWebtoonStatus(webtoon, DownloadStatus.STOPPED)}
        />
        {webtoon.status === DownloadStatus.STARTED ? (
          <ActionButtonSmall
            svgName="pause"
            tooltip="Pause"
            onClick={() => setWebtoonStatus(webtoon, DownloadStatus.PAUSED)}
          />
        ) : (
          <ActionButtonSmall
            svgName="start"
            tooltip="Start"
            onClick={() => setWebtoonStatus(webtoon, DownloadStatus.STARTED)}
          />
        )}
      </div>
    </div>
  );
}
