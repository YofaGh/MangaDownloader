import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import { QCard, ActionButtonBig } from ".";
import { attemptToDownload } from "../operators";
import {
  fixFolderName,
  removeDirectory,
  DownloadStatus,
  WebtoonType,
} from "../utils";
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
    removeAllFromQueue,
    reOrderQueue,
    updateAllItemsInQueue,
    updateItemInQueue,
    deleteItemKeysInQueue,
    deleteKeysFromAllItemsInQueue,
  } = useQueueStore();
  const { downloading, clearDownloading, setStopRequested } =
    useDownloadingStore();
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

  const stopDownloader = async () => {
    setStopRequested(true);
    clearDownloading();
  };

  const confirmChanges = () => {
    reOrderQueue(queu);
    setQueueEditable(false);
  };

  useEffect(() => {
    if (!queueEditable) setQueu(queue);
  }, [queue, queueEditable]);

  const removeAllWebtoonsFromQueue = async () => {
    if (downloading) stopDownloader();
    queue.forEach((webtoon) => {
      let folderName = fixFolderName(webtoon.title);
      if (webtoon.type === WebtoonType.MANGA) folderName += `/${webtoon.info}`;
      removeDirectory(`${download_path}/${folderName}`, true);
    });
    removeAllFromQueue();
    addSuccessNotification(`Removed all from queue`);
  };

  const removeWebtoonFromQueue = async (webtoon) => {
    if (downloading && webtoon.id === downloading.id) stopDownloader();
    let folderName = fixFolderName(webtoon.title);
    let notifInfo = webtoon.title;
    if (webtoon.type === WebtoonType.MANGA) {
      folderName += `/${webtoon.info}`;
      notifInfo += ` - ${webtoon.info}`;
    }
    removeFromQueue(webtoon.id);
    addSuccessNotification(`Removed ${notifInfo} from queue`);
    removeDirectory(`${download_path}/${folderName}`, true);
    attemptToDownload();
  };

  const handleWebtoonStatusChange = async (webtoon) => {
    let fixedFolderName, folderName;
    fixedFolderName = folderName = fixFolderName(webtoon.title);
    if (webtoon.type === WebtoonType.MANGA) folderName += `/${webtoon.info}`;
    removeDirectory(`${download_path}/${folderName}`, true);
    if (webtoon.type === WebtoonType.MANGA)
      removeDirectory(`${download_path}/${fixedFolderName}`, false);
  };

  const setAllWebtoonsStatus = async (status) => {
    if (status !== DownloadStatus.STARTED && downloading) stopDownloader();
    updateAllItemsInQueue({ status });
    if (status === DownloadStatus.STOPPED) {
      deleteKeysFromAllItemsInQueue(["image", "total"]);
      queue.forEach((webtoon) => handleWebtoonStatusChange(webtoon));
    }
    if (status === DownloadStatus.STARTED) attemptToDownload();
  };

  const setWebtoonStatus = async (webtoon, status) => {
    if (
      status !== DownloadStatus.STARTED &&
      downloading &&
      webtoon.id === downloading.id
    )
      stopDownloader();
    if (status === DownloadStatus.STOPPED) {
      deleteItemKeysInQueue(webtoon.id, ["image", "total"]);
      handleWebtoonStatusChange(webtoon);
    }
    updateItemInQueue(webtoon.id, { status });
    if (status === DownloadStatus.STARTED) attemptToDownload(webtoon);
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
              onClick={() => setAllWebtoonsStatus(DownloadStatus.STOPPED)}
            />
            <ActionButtonBig
              tooltip="Pause All"
              svgName="pause"
              onClick={() => setAllWebtoonsStatus(DownloadStatus.PAUSED)}
            />
            <ActionButtonBig
              tooltip="Start All"
              svgName="start"
              onClick={() => setAllWebtoonsStatus(DownloadStatus.STARTED)}
            />
            <ActionButtonBig
              tooltip="Delete All"
              svgName="trash"
              onClick={removeAllWebtoonsFromQueue}
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
