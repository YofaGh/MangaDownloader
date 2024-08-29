import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { invoke } from "@tauri-apps/api/core";
import { QCard, ActionButtonBig } from ".";
import { fixFolderName, startDownloading } from "../utils";
import {
  useQueueStore,
  useDownloadingStore,
  useSettingsStore,
  useNotificationStore,
} from "../store";

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
  const { downloading, clearDownloading } = useDownloadingStore();
  const { download_path } = useSettingsStore((state) => state.settings);
  const [queueEditable, setQueueEditable] = useState(false);
  const [queu, setQueu] = useState(queue);
  const { addSuccessNotification } = useNotificationStore();

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

  const removeDirectory = async (path, recursive) =>
    await invoke("remove_directory", { path, recursive });

  const stopDownloader = async () => {
    await invoke("stop_download");
    clearDownloading();
  };

  const confirmChanges = () => {
    reOrderQueue(queu);
    setQueueEditable(false);
  };

  useEffect(() => {
    if (!queueEditable) setQueu(queue);
  }, [queue, queueEditable]);

  const removeWebtoonFromQueue = async (webtoon) => {
    let folderName = fixFolderName(webtoon.title);
    let notifInfo = webtoon.title;
    if (webtoon.type === "manga") {
      folderName += `/${webtoon.info}`;
      notifInfo += ` - ${webtoon.info}`;
    }
    removeFromQueue(webtoon.id);
    addSuccessNotification(`Removed ${notifInfo} from queue`);
    if (downloading && webtoon.id === downloading.id) stopDownloader();
    removeDirectory(`${download_path}/${folderName}`, true);
  };

  const handleWebtoonStatusChange = async (webtoon) => {
    let fixedFolderName, folderName;
    fixedFolderName = folderName = fixFolderName(webtoon.title);
    if (webtoon.type === "manga") folderName += `/${webtoon.info}`;
    removeDirectory(`${download_path}/${folderName}`, true);
    if (webtoon.type === "manga")
      removeDirectory(`${download_path}/${fixedFolderName}`, false);
  };

  const setAllWebtoonsStatus = async (status) => {
    updateAllItemsInQueue({ status });
    if (status !== "Started" && downloading) stopDownloader();
    if (status === "Not Started") {
      deleteKeysFromAllItemsInQueue(["image", "total"]);
      queue.forEach((webtoon) => handleWebtoonStatusChange(webtoon));
    }
    if (status === "Started" && !downloading) startDownloading();
  };

  const setWebtoonStatus = async (webtoon, status) => {
    updateItemInQueue(webtoon.id, { status });
    if (status !== "Started" && downloading && webtoon.id === downloading.id)
      stopDownloader();
    if (status === "Not Started") {
      deleteItemKeysInQueue(webtoon.id, ["image", "total"]);
      handleWebtoonStatusChange(webtoon);
    }
    if (status === "Started" && !downloading) startDownloading();
  };

  if (queue.length === 0)
    return (
      <div className="queue-div">
        <div className="manage">
          <div className="info-manage">Number of Items: 0</div>
        </div>
      </div>
    );
  return (
    <div className="queue-div">
      <div className="manage">
        <div className="info-manage">Number of Items: {queu.length}</div>
        {!queueEditable ? (
          <div className="manage-btn">
            <ActionButtonBig
              tooltip="Edit List"
              svgName="edit"
              onClick={() => setQueueEditable(true)}
            />
            <ActionButtonBig
              tooltip="Stop All"
              svgName="stop"
              onClick={() => setAllWebtoonsStatus("Not Started")}
            />
            <ActionButtonBig
              tooltip="Pause All"
              svgName="pause"
              onClick={() => setAllWebtoonsStatus("Paused")}
            />
            <ActionButtonBig
              tooltip="Start All"
              svgName="start"
              onClick={() => setAllWebtoonsStatus("Started")}
            />
            <ActionButtonBig
              tooltip="Delete All"
              svgName="trash"
              onClick={() =>
                queue.forEach((webtoon) => removeWebtoonFromQueue(webtoon))
              }
            />
          </div>
        ) : (
          <div className="manage-btn">
            <ActionButtonBig
              tooltip="Discard"
              svgName="delete"
              onClick={discardChanges}
            />
            <ActionButtonBig
              tooltip="Apply"
              svgName="done"
              onClick={confirmChanges}
            />
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
                {queu.map((webtoon, index) => (
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
                          removeWebtoonFromQueue={removeWebtoonFromQueue}
                          setWebtoonStatus={setWebtoonStatus}
                        />
                      </li>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </ul>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
}
