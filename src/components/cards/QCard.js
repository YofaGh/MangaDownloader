export default function QCard({ webtoon, deleteWebtoon, setWebtoonStatus }) {
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
              {(webtoon.image || 0) + ""}/
              {(webtoon.total || 0) + ""}
            </div>
          ) : (
            <div className="d-status">
              Downladed {(webtoon.image || 0) + ""}/
              {(webtoon.total || 0) + ""} Images
            </div>
          )}
        </div>
      ) : (
        <></>
      )}
      <div className="button-containerrr">
        <button className="buttonh" onClick={() => deleteWebtoon(webtoon)}>
          <img alt="" src="./assets/trash.svg" className="icon"></img>
          <span className="tooltip">Delete</span>
        </button>
        <button
          className="buttonh"
          onClick={() => setWebtoonStatus(webtoon, "Not Started")}
        >
          <img alt="" src="./assets/stop.svg" className="icon"></img>
          <span className="tooltip">Stop</span>
        </button>
        {webtoon.status === "Not Started" || webtoon.status === "Paused" ? (
          <button
            className="buttonh"
            onClick={() => setWebtoonStatus(webtoon, "Started")}
          >
            <img alt="" src="./assets/start.svg" className="icon"></img>
            <span className="tooltip">Start</span>
          </button>
        ) : (
          <button
            className="buttonh"
            onClick={() => setWebtoonStatus(webtoon, "Paused")}
          >
            <img alt="" src="./assets/pause.svg" className="icon"></img>
            <span className="tooltip">Pause</span>
          </button>
        )}
      </div>
    </div>
  );
}
