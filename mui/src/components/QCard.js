import "./QCard.css";

export default function QCard({ webtoon, addQueueMessage }) {

  const removeWebtoon = (webtoon) => {
    addQueueMessage({
      removeWebtoon: { webtoon },
    });
  };

  const setWebtoonStatus = (webtoon, status) => {
    addQueueMessage({
      setWebtoonStatus: { webtoon, status }
    });
  };

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
              {(webtoon.downloading || 0) + ""}/{(webtoon.totalImages || 0) + ""}
            </div>
          ) : (
            <div className="d-status">
              Downladed {(webtoon.downloading || 0) + ""}/{(webtoon.totalImages || 0) + ""} Images
            </div>
          )}
        </div>
      ) : (
        <></>
      )}
      <div className="button-containerr">
        <button className="buttonh" onClick={() => removeWebtoon(webtoon)}>
          <img alt="" src="./assets/delete.svg" className="icon"></img>
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
        <button className="buttonh">
          <img alt="" src="./assets/more.svg" className="icon"></img>
          <span className="tooltip">More</span>
        </button>
      </div>
    </div>
  );
}
