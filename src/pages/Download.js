import { useState } from "react";
import "../styles/Download.css";
import { Queue, Downloaded, PushButton } from "./../components";

export default function Download({
  queue,
  addQueueMessage,
  downloaded,
  addDownloadedMessage,
  download_path,
  mergeMethod,
}) {
  const [current, setCurrent] = useState("queue");

  return (
    <div className="container">
      <div className="scrollmenu">
        <PushButton label={"Queue"} onClick={() => setCurrent("queue")}/>
        <PushButton label={"Downloaded"} onClick={() => setCurrent("downloaded")}/>
      </div>
        {current === "queue" ? (
          <Queue queue={queue} addQueueMessage={addQueueMessage} />
        ) : (
          <Downloaded
            downloaded={downloaded}
            addDownloadedMessage={addDownloadedMessage}
            download_path={download_path}
            mergeMethod={mergeMethod}
          />
        )}
    </div>
  );
}
