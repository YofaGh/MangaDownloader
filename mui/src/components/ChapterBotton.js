import "./ChapterButton.css";

export default function ChapterButton({ chapter, addManga }) {
  return (
    <button class="btn-cssbuttons">
      <div className="chapter">
        {chapter.name}
      </div>
      <ul>
        <li>
          <button className="mg-button download-btn" onClick={() => addManga(chapter, "Started")}>
            <img alt="" src="./assets/download.svg" className="btng-icon"></img>
          </button>
        </li>
        <li>
          <button className="mg-button queue-btn" onClick={() => addManga(chapter, "Not Started")}>
            <img alt="" src="./assets/queue.svg" className="btng-icon"></img>
          </button>
        </li>
      </ul>
    </button>
  );
}
