import React, { useState } from "react";
import Queue from "./../components/Queue";
import "../styles/Download.css";
import Downloaded from "./../components/Downloaded";
import PushButton from "./../components/PushButton";

export default function Download({
  queue,
  addQueueMessage,
  downloaded,
  addDownloadedMessage,
  downloadPath,
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
            downloadPath={downloadPath}
            mergeMethod={mergeMethod}
          />
        )}
    </div>
  );
}
