import { Link } from "react-router-dom";
import { ActionButton } from "..";
import { DownloadStatus, showInBrowser } from "../../utils";

export default function QCard({
  webtoon,
  setWebtoonStatus,
  removeWebtoonFromQueue,
}) {
  let image = webtoon.image || 0;
  let total = webtoon.total || 0;
  let inf = total === 0 ? "" : `${image}/${total}`;
  const webtoonLink = `/${webtoon.module}/webtoon/${
    webtoon.manga || webtoon.doujin
  }`;

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
              ? `Downloading Image ${inf}`
              : `Downloaded ${inf} Images`}
          </div>
        </div>
      )}
      <div className="button-containerrr">
        <ActionButton
          svgName="maximize"
          tooltip="Show in browser"
          onClick={() => showInBrowser(webtoon)}
        />
        <Link to={webtoonLink}>
          <ActionButton svgName="about" tooltip="Go to Webtoon" />
        </Link>
        <ActionButton
          svgName="trash"
          tooltip="Delete"
          onClick={() => removeWebtoonFromQueue(webtoon)}
        />
        <ActionButton
          svgName="stop"
          tooltip="Stop"
          onClick={() => setWebtoonStatus(webtoon, DownloadStatus.STOPPED)}
        />
        {webtoon.status === DownloadStatus.STARTED ? (
          <ActionButton
            svgName="pause"
            tooltip="Pause"
            onClick={() => setWebtoonStatus(webtoon, DownloadStatus.PAUSED)}
          />
        ) : (
          <ActionButton
            svgName="start"
            tooltip="Start"
            onClick={() => setWebtoonStatus(webtoon, DownloadStatus.STARTED)}
          />
        )}
      </div>
    </div>
  );
}
