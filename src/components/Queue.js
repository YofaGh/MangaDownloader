import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { QCard, fixNameForFolder } from ".";
import {
  useQueueStore,
  useDownloadingStore,
  useSettingsStore,
  useNotificationStore,
  useInitDownloadStore,
} from "../store";
import { invoke } from "@tauri-apps/api/core";

export default function Queue() {
  const {
    queue,
    removeFromQueue,
    reOrderQueue,
    updateAllItemsInQueue,
    updateItemInQueue,
    deleteItemKeysInQueue,
    deleteKeysFromAllItemsInQueue,
  } = useQueueStore();
  const { downloading, clearDownloading } =
    useDownloadingStore();
  const settings = useSettingsStore((state) => state.settings);
  const [queueEditable, setQueueEditable] = useState(false);
  const [queu, setQueu] = useState(queue);
  const { addNotification } = useNotificationStore();
  const increaseInitDownload = useInitDownloadStore((state) => state.increaseInitDownload);

  function handleOnDragEnd(result) {
    if (!result.destination) return;

    const items = Array.from(queu);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setQueu(items);
  }

  const discardChanges = () => {
    setQueueEditable(false);
    setQueu(queue);
  };

  const removeDirectory = async (path, recursive) => {
    await invoke("remove_directory", { path, recursive });
  };

  const stopDownloader = async () => {
    await invoke("stop_download");
    clearDownloading();
  };

  const confirmChanges = () => {
    const order = queu.map((item) => item.id);
    reOrderQueue(order);
    setQueueEditable(false);
  };

  useEffect(() => {
    if (!queueEditable) {
      setQueu(queue);
    }
  }, [queue, queueEditable]);

  const removeWebtoonFromQueue = async (webtoon) => {
    removeFromQueue(webtoon.id);
    addNotification(
      webtoon.type === "manga"
        ? `Removed ${webtoon.title} - ${webtoon.info} from queue`
        : `Removed ${webtoon.title} from queue`,
      "SUCCESS"
    );
    if (downloading && webtoon.id === downloading.id) {
      stopDownloader();
    }
    let folderName =
      webtoon.type === "manga"
        ? `${fixNameForFolder(webtoon.title)}/${webtoon.info}`
        : fixNameForFolder(webtoon.title);
    removeDirectory(`${settings.download_path}/${folderName}`, true);
  };

  const setAllWebtoonsStatus = async (status) => {
    updateAllItemsInQueue({ status });
    if ((status === "Paused" || status === "Not Started") && downloading) {
      stopDownloader();
    }
    if (status === "Not Started") {
      deleteKeysFromAllItemsInQueue(["image", "total"]);
      for (const webtoon of queue) {
        let folderName =
          webtoon.type === "manga"
            ? `${fixNameForFolder(webtoon.title)}/${webtoon.info}`
            : fixNameForFolder(webtoon.title);
        removeDirectory(`${settings.download_path}/${folderName}`, true);
        if (webtoon.type === "manga") {
          removeDirectory(
            `${settings.download_path}/${fixNameForFolder(webtoon.title)}`,
            false
          );
        }
      }
    }
    if (status === "Started" && !downloading) {
      increaseInitDownload();
    }
  };

  const deleteAllWebtoons = () => {
    for (const webtoon of queue) {
      removeWebtoonFromQueue(webtoon);
    }
  };

  const deleteWebtoon = (webtoon) => {
    removeWebtoonFromQueue(webtoon);
  };

  const setWebtoonStatus = async (webtoon, status) => {
    updateItemInQueue(webtoon.id, { status });
    if (
      downloading &&
      webtoon.id === downloading.id &&
      (status === "Paused" || status === "Not Started")
    ) {
      stopDownloader();
    }
    if (status === "Not Started") {
      deleteItemKeysInQueue(webtoon.id, ["image", "total"]);
      let folderName =
        webtoon.type === "manga"
          ? `${fixNameForFolder(webtoon.title)}/${webtoon.info}`
          : fixNameForFolder(webtoon.title);
      removeDirectory(`${settings.settings.download_path}/${folderName}`, true);
      if (webtoon.type === "manga") {
        removeDirectory(
          `${settings.download_path}/${fixNameForFolder(webtoon.title)}`,
          false
        );
      }
    }
    if (status === "Started" && !downloading) {
      increaseInitDownload();
    }
  };

  return queue.length !== 0 ? (
    <div className="queue-div">
      <div className="manage">
        <div className="info-manage">Number of Items: {queu.length}</div>
        {!queueEditable ? (
          <div className="manage-btn">
            <button className="buttong" onClick={() => setQueueEditable(true)}>
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
            <button className="buttong" onClick={deleteAllWebtoons}>
              <img alt="" src="./assets/trash.svg" className="icon"></img>
              <span className="tooltip">Delete All</span>
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
                          <QCard
                            webtoon={webtoon}
                            deleteWebtoon={deleteWebtoon}
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
  ) : (
    <div className="no-info">
      <h2>There are no webtoons</h2>
    </div>
  );
}
