import { useState } from "react";
import { Queue, Downloaded, PushButton } from "../components";

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
        <PushButton label={"Queue"} onClick={() => setCurrent("queue")} />
        <PushButton
          label={"Downloaded"}
          onClick={() => setCurrent("downloaded")}
        />
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
