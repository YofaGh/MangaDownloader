export default function ChapterButton({ chapter, addManga }) {
  return (
    <button className="btn-cssbuttons">
      <div className="chapter">{chapter.name}</div>
      <ul>
        <li>
          <span
            className="mg-button download-btn"
            onClick={() => addManga(chapter, "Started")}
          >
            <img alt="" src="./assets/download.svg" className="btng-icon"></img>
          </span>
        </li>
        <li>
          <span
            className="mg-button queue-btn"
            onClick={() => addManga(chapter, "Not Started")}
          >
            <img alt="" src="./assets/queue.svg" className="btng-icon"></img>
          </span>
        </li>
      </ul>
    </button>
  );
}
