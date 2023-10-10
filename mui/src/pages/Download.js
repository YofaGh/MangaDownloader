import React, { useState, useEffect } from "react";
import Queue from "./../components/Queue"
import "./Download.css";
import Downloaded from "./../components/Downloaded";

export default function Download({ queue, addQueueMessage, downloaded }) {
  const [current, setCurrent] = useState("queue");

  return (
    <div className="container">
      <div className="scrollmenu">
        <span onClick={() => setCurrent("queue")}>Queue</span>
        <span onClick={() => setCurrent("downloaded")}>Downloaded</span>
      </div>
      {current === "queue" ? <Queue queue={queue} addQueueMessage={addQueueMessage} /> : <Downloaded downloaded={downloaded} />}
    </div>
  );
}
