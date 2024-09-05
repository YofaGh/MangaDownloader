import { DownloadStatus } from "../../utils";
import { Icon } from "..";

export default function ChapterButton({ chapter, addChapter }) {
  return (
    <button className="btn-cssbuttons">
      <div className="chapter">{chapter.name}</div>
      <ul>
        <li>
          <span
            className="mg-button download-btn"
            onClick={() => addChapter(chapter, DownloadStatus.STARTED)}
          >
            <Icon svgName="download" className="btng-icon" />
          </span>
        </li>
        <li>
          <span
            className="mg-button queue-btn"
            onClick={() => addChapter(chapter, DownloadStatus.STOPPED)}
          >
            <Icon svgName="queue" className="btng-icon" />
          </span>
        </li>
      </ul>
    </button>
  );
}
