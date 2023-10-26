import React, { useState } from "react";
import Queue from "./../components/Queue";
import "../styles/Download.css";
import Downloaded from "./../components/Downloaded";

export default function Download({
  queue,
  addQueueMessage,
  downloaded,
  addDownloadedMessage,
}) {
  const [current, setCurrent] = useState("queue");

  return (
    <div className="container">
      <div className="scrollmenu">
        <span onClick={() => setCurrent("queue")}>Queue</span>
        <span onClick={() => setCurrent("downloaded")}>Downloaded</span>
      </div>
        {current === "queue" ? (
          <Queue queue={queue} addQueueMessage={addQueueMessage} />
        ) : (
          <Downloaded
            downloaded={downloaded}
            addDownloadedMessage={addDownloadedMessage}
          />
        )}
    </div>
  );
}
