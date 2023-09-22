import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import QueueCard from "../components/QueueCard";
import "./Queue.css";

export default function Queue() {
  const [queue, setQueue] = useState([]);
  const [queueEditable, setQueueEditable] = useState(false);
  const list0 = [
    {
      type: "manga",
      id: "manhuascan.us_$_secret-class_$_chapter-1",
      title: "Secret Class",
      info: "Chapter 001",
      module: "manhuascan.us",
      manga: "secret-class",
      chapter: "chapter-1",
      status: "Not Started",
      downloaded: 5,
    },
    {
      type: "manga",
      id: "manhuascan.us_$_secret-class_$_chapter-2",
      title: "Secret Class",
      info: "Chapter 002",
      module: "manhuascan.us",
      manga: "secret-class",
      chapter: "chapter-2",
      status: "Not Started",
      downloaded: 6,
    },
    {
      type: "doujin",
      id: "nyahentai.red_$_123456",
      title: "Himawari",
      info: "123456",
      module: "nyahentai.red",
      doujin: "123456",
      status: "Not Started",
      downloaded: 7,
    },
    {
      type: "doujin",
      id: "nyahentai.red_$_456789",
      title: "Metamorphis",
      info: "456789",
      module: "nyahentai.red",
      doujin: "456789",
      status: "Not Started",
      downloaded: 8,
    },
  ];
  const [list, updateList] = useState([]);
  const [listBeforeEdit, setListBeforeEdit] = useState([]);

  useEffect(() => {
    updateList(window.do.getJsonFile("queue.json"));
  }, []);

  function handleOnDragEnd(result) {
    if (!result.destination) return;

    const items = Array.from(list);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateList(items);
  }

  const updateQueue = (gg) => {
    window.do.setJsonFile(
      "queue.json",
      gg
    );
  };

  const updateAndSave = (li) => {
    updateList(li);
    updateQueue(li);
  }

  const enterEditMode = () => {
    setListBeforeEdit(list);
    setQueueEditable(true);
  };

  const discardChanges = () => {
    setQueueEditable(false);
    updateList(listBeforeEdit);
    setListBeforeEdit([]);
  };

  const confirmChanges = () => {
    setQueueEditable(false);
    updateAndSave(list);
  };

  const removeWebtoon = (webtoon) => {
    updateAndSave(list.filter((item) => item.id !== webtoon.id));
  };

  const setWebtoonStatus = (webtoon, status) => {
    const updatedList = list.map((item) => {
      if (item.id === webtoon.id) {
        item.status = status;
      }
      return item;
    });

    updateAndSave(updatedList);
  };

  const setAllWebtoonsStatus = (status) => {
    updateAndSave(
      list.map((item) => {
        item.status = status;
        return item;
      })
    );
  };

  return (
    <div className="container">
      <div className="menu-bar">
        <h1>Queue</h1>
      </div>
      <div className="queue-div">
        <div className="manage">
          <div className="info-manage">Number of Items: {list.length}</div>
          {!queueEditable ? (
            <div className="manage-btn">
              <button class="buttong" onClick={enterEditMode}>
                <img alt="" src="./assets/edit.svg" className="icon"></img>
                <span class="tooltip">Edit List</span>
              </button>
              <button
                class="buttong"
                onClick={() => setAllWebtoonsStatus("Not Started")}
              >
                <img alt="" src="./assets/stop.svg" className="icon"></img>
                <span class="tooltip">Stop All</span>
              </button>
              <button
                class="buttong"
                onClick={() => setAllWebtoonsStatus("Paused")}
              >
                <img alt="" src="./assets/pause.svg" className="icon"></img>
                <span class="tooltip">Pause All</span>
              </button>
              <button
                class="buttong"
                onClick={() => setAllWebtoonsStatus("Started")}
              >
                <img alt="" src="./assets/start.svg" className="icon"></img>
                <span class="tooltip">Start All</span>
              </button>
              <button class="buttong">
                <img alt="" src="./assets/more.svg" className="icon"></img>
                <span class="tooltip">More</span>
              </button>
            </div>
          ) : (
            <div className="manage-btn">
              <button class="buttong" onClick={discardChanges}>
                <img alt="" src="./assets/delete.svg" className="icon"></img>
                <span class="tooltip">Discard</span>
              </button>
              <button class="buttong" onClick={confirmChanges}>
                <img alt="" src="./assets/done.svg" className="icon"></img>
                <span class="tooltip">Apply</span>
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
                  {list.map((webtoon, index) => {
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
                              removeWebtoon={removeWebtoon}
                              setWebtoonStatus={setWebtoonStatus}
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
