import "./ChapterButton.css";

export default function ChapterButton({ chapter, download, addToQueue }) {
  return (
    <button class="btn-cssbuttons">
      <div className="chapter">
        {chapter.name}
      </div>
      <ul>
        <li>
          <button className="mg-button download-btn" onClick={download}>
            <img alt="" src="./assets/download.svg" className="btng-icon"></img>
          </button>
        </li>
        <li>
          <button className="mg-button queue-btn" onClick={addToQueue}>
            <img alt="" src="./assets/queue.svg" className="btng-icon"></img>
          </button>
        </li>
      </ul>
    </button>
  );
}
