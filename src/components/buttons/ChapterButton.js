import { DownloadStatus } from "../../utils";

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
            <img alt="" src="./assets/download.svg" className="btng-icon"></img>
          </span>
        </li>
        <li>
          <span
            className="mg-button queue-btn"
            onClick={() => addChapter(chapter, DownloadStatus.STOPPED)}
          >
            <img alt="" src="./assets/queue.svg" className="btng-icon"></img>
          </span>
        </li>
      </ul>
    </button>
  );
}
