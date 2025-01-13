import { Link } from "react-router-dom";
import { ActionButton } from "..";
import { useQueueStore } from "../../store";
import { attemptToDownload } from "../../operators";
import {
  convert,
  merge,
  openFolder,
  openUrl,
  getChapterUrl,
  getWebtoonUrl,
  WebtoonType,
  DownloadStatus,
} from "../../utils";

export default function DCard({ webtoon, removeWebtoon, deleteFolder }) {
  const { addToQueue } = useQueueStore();
  const webtoonLink = `/${webtoon.module}/webtoon/${
    webtoon.manga || webtoon.doujin
  }`;
  const showInBrowser = async () => {
    let url =
      webtoon.type === WebtoonType.MANGA
        ? getChapterUrl(webtoon.module, webtoon.manga, webtoon.chapter)
        : getWebtoonUrl(webtoon.module, webtoon.doujin);
    openUrl(await url);
  };

  const restart = () => {
    removeWebtoon(webtoon.id);
    let info =
      webtoon.type === WebtoonType.MANGA
        ? {
            manga: webtoon.manga,
            info: webtoon.info,
            chapter: webtoon.chapter,
          }
        : { doujin: webtoon.doujin, info: webtoon.doujin };
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

  return (
    <div className="queue-card">
      <div className="infog">
        <div className="card-titlee">{webtoon.title}</div>
        <div className="card-info">{webtoon.info}</div>
        <div className="card-domain">{webtoon.module}</div>
      </div>
      <div className="statusg">
        <div className="d-status">Downladed {webtoon.images + ""} Images</div>
      </div>
      <div className="button-containerrr">
        <ActionButton
          svgName="merge"
          tooltip="Merge"
          icnClassName="icofn"
          onClick={() => merge(webtoon, true)}
        />
        <ActionButton
          svgName="pdf"
          icnClassName="icofn"
          tooltip="Convert to PDF"
          onClick={() => convert(webtoon, true)}
        />
        <ActionButton
          svgName="maximize"
          tooltip="Show in browser"
          onClick={showInBrowser}
        />
        <Link to={webtoonLink}>
          <ActionButton svgName="about" tooltip="Go to Webtoon" />
        </Link>
        <ActionButton
          svgName="restart"
          tooltip="Download Again"
          onClick={restart}
        />
        <ActionButton
          svgName="folder"
          tooltip="Open Folder"
          onClick={() => openFolder(webtoon.path)}
        />
        <ActionButton
          svgName="delete"
          tooltip="Remove"
          onClick={() => removeWebtoon(webtoon.id)}
        />
        <ActionButton
          svgName="trash"
          tooltip="Delete Folder"
          onClick={() => deleteFolder(webtoon)}
        />
      </div>
    </div>
  );
}
