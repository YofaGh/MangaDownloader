import React, { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import QueueCard from "../components/QueueCard";
import "./Queue.css";

export default function Queue({ queue, addQueueMessage }) {
  const [queueEditable, setQueueEditable] = useState(false);
  const [queu, setQueu] = useState(queue);

  function handleOnDragEnd(result) {
    if (!result.destination) return;

    const items = Array.from(queue);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQueu(items);
  }

  const discardChanges = () => {
    setQueueEditable(false);
    setQueu(queue);
  };

  const confirmChanges = () => {
    const order = queu.map((item) => item.id);
    addQueueMessage({ reOrderQueue: { order } });
    setQueueEditable(false);
  };

  useEffect(() => {
    if (!queueEditable) {
      setQueu(queue);
    }
  }, [queue, queueEditable]);

  const setAllWebtoonsStatus = (status) => {
    addQueueMessage({
      setAllWebtoonsStatus: { status },
    });
  };

  return (
    <div className="container">
      <div className="menu-bar">
        <h1>Queue</h1>
      </div>
      <div className="queue-div">
        <div className="manage">
          <div className="info-manage">Number of Items: {queu.length}</div>
          {!queueEditable ? (
            <div className="manage-btn">
              <button
                className="buttong"
                onClick={() => setQueueEditable(true)}
              >
                <img alt="" src="./assets/edit.svg" className="icon"></img>
                <span className="tooltip">Edit List</span>
              </button>
              <button
                className="buttong"
                onClick={() => setAllWebtoonsStatus("Not Started")}
              >
                <img alt="" src="./assets/stop.svg" className="icon"></img>
                <span className="tooltip">Stop All</span>
              </button>
              <button
                className="buttong"
                onClick={() => setAllWebtoonsStatus("Paused")}
              >
                <img alt="" src="./assets/pause.svg" className="icon"></img>
                <span className="tooltip">Pause All</span>
              </button>
              <button
                className="buttong"
                onClick={() => setAllWebtoonsStatus("Started")}
              >
                <img alt="" src="./assets/start.svg" className="icon"></img>
                <span className="tooltip">Start All</span>
              </button>
              <button className="buttong">
                <img alt="" src="./assets/more.svg" className="icon"></img>
                <span className="tooltip">More</span>
              </button>
            </div>
          ) : (
            <div className="manage-btn">
              <button className="buttong" onClick={discardChanges}>
                <img alt="" src="./assets/delete.svg" className="icon"></img>
                <span className="tooltip">Discard</span>
              </button>
              <button className="buttong" onClick={confirmChanges}>
                <img alt="" src="./assets/done.svg" className="icon"></img>
                <span className="tooltip">Apply</span>
              </button>
            </div>
          )}
        </div>
        <div className="queue-list">
          <DragDropContext onDragEnd={handleOnDragEnd}>
            <Droppable droppableId="characters">
              {(provided) => (
                <ul
                  className="ul-queue"
                  {...provided.droppableProps}
                  ref={provided.innerRef}
                >
                  {queu.map((webtoon, index) => {
                    return (
                      <Draggable
                        key={webtoon.id}
                        draggableId={webtoon.id}
                        index={index}
                        isDragDisabled={!queueEditable}
                      >
                        {(provided) => (
                          <li
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <QueueCard
                              webtoon={webtoon}
                              addQueueMessage={addQueueMessage}
                            />
                          </li>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </ul>
              )}
            </Droppable>
          </DragDropContext>
        </div>
      </div>
    </div>
  );
}
