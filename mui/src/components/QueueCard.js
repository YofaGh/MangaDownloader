import "./QueueCard.css";

export default function QueueCard({
  webtoon,
  removeWebtoon,
  setWebtoonStatus,
}) {
  return (
    <div className="queue-card">
      <div className="infog">
        <div className="card-titlee">{webtoon.title}</div>
        <div className="card-info">{webtoon.info}</div>
        <div className="card-domain">{webtoon.module}</div>
      </div>
      {webtoon.status !== "Not Started" ? (
        <div className="statusg">
          {webtoon.status === "Started" ? (
            <div className="d-status">
              Downlading Image
              <br />
              {webtoon.downloaded+""}/20
            </div>
          ) : (
            <div className="d-status">
              Downladed {webtoon.downloaded+""}/20 Images
            </div>
          )}
        </div>
      ) : (
        <></>
      )}
      <div class="button-containerr">
        <button class="buttonh" onClick={() => removeWebtoon(webtoon)}>
          <img alt="" src="./assets/delete.svg" className="icon"></img>
          <span class="tooltip">Delete</span>
        </button>
        <button
          class="buttonh"
          onClick={() => setWebtoonStatus(webtoon, "Not Started")}
        >
          <img alt="" src="./assets/stop.svg" className="icon"></img>
          <span class="tooltip">Stop</span>
        </button>
        {webtoon.status === "Not Started" || webtoon.status === "Paused" ? (
          <button
            class="buttonh"
            onClick={() => setWebtoonStatus(webtoon, "Started")}
          >
            <img alt="" src="./assets/start.svg" className="icon"></img>
            <span class="tooltip">Start</span>
          </button>
        ) : (
          <button
            class="buttonh"
            onClick={() => setWebtoonStatus(webtoon, "Paused")}
          >
            <img alt="" src="./assets/pause.svg" className="icon"></img>
            <span class="tooltip">Pause</span>
          </button>
        )}
        <button class="buttonh">
          <img alt="" src="./assets/more.svg" className="icon"></img>
          <span class="tooltip">More</span>
        </button>
      </div>
    </div>
  );
}
