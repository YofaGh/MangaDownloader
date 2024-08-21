import { ActionButtonSmall } from "..";

export default function QCard({
  webtoon,
  removeWebtoonFromQueue,
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
              {(webtoon.image || 0) + ""}/{(webtoon.total || 0) + ""}
            </div>
          ) : (
            <div className="d-status">
              Downladed {(webtoon.image || 0) + ""}/{(webtoon.total || 0) + ""}{" "}
              Images
            </div>
          )}
        </div>
      ) : (
        <></>
      )}
      <div className="button-containerrr">
        <ActionButtonSmall svgName="trash" tooltip="Delete" onClick={() => removeWebtoonFromQueue(webtoon)}  />
        <ActionButtonSmall svgName="stop" tooltip="Stop" onClick={() => setWebtoonStatus(webtoon, "Not Started")} />
        {webtoon.status === "Not Started" || webtoon.status === "Paused" ? (
          <ActionButtonSmall svgName="start" tooltip="Start" onClick={() => setWebtoonStatus(webtoon, "Started")} />
        ) : (
          <ActionButtonSmall svgName="pause" tooltip="Pause" onClick={() => setWebtoonStatus(webtoon, "Paused")} />
        )}
      </div>
    </div>
  );
}
