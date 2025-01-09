import { useEffect, useState } from "react";
import { CSS } from "@dnd-kit/utilities";
import {
  arrayMove,
  useSortable,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { QCard, ActionButton } from ".";
import { attemptToDownload } from "../operators";
import {
  WebtoonType,
  fixFolderName,
  DownloadStatus,
  removeDirectory,
} from "../utils";
import {
  useQueueStore,
  useSettingsStore,
  useDownloadingStore,
  useNotificationStore,
} from "../store";

export default function Queue() {
  const {
    queue,
    reOrderQueue,
    removeFromQueue,
    updateItemInQueue,
    removeAllFromQueue,
    updateAllItemsInQueue,
    deleteImagesAndTotalFromWebtoon,
    deleteImagesAndTotalFromQueue,
  } = useQueueStore();
  const { downloading, clearDownloading, setStopRequested } =
    useDownloadingStore();
  const [queu, setQueu] = useState(queue);
  const [queueEditable, setQueueEditable] = useState(false);
  const { download_path } = useSettingsStore((state) => state.settings);
  const notifySuccess = useNotificationStore((state) => state.notifySuccess);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setQueu((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const discardChanges = () => {
    setQueueEditable(false);
    setQueu(queue);
  };

  const stopDownloader = () => {
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
    notifySuccess(`Removed all from queue`);
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
    notifySuccess(`Removed ${notifInfo} from queue`);
    removeDirectory(`${download_path}/${folderName}`, true);
    attemptToDownload();
  };

  const handleWebtoonStatusChange = (webtoon) => {
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
      deleteImagesAndTotalFromQueue();
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
      deleteImagesAndTotalFromWebtoon(webtoon.id);
      handleWebtoonStatusChange(webtoon);
    }
    updateItemInQueue(webtoon.id, { status });
    if (status === DownloadStatus.STARTED) attemptToDownload();
  };

  if (queue.length === 0)
    return (
      <div className="manage">
        <div className="info-manage">Number of Items: 0</div>
      </div>
    );

  return (
    <div>
      <div className="manage">
        <div className="info-manage">Number of Items: {queu.length}</div>
        {!queueEditable ? (
          <div className="manage-btn">
            <ActionButton
              svgName="edit"
              tooltip="Edit List"
              onClick={() => setQueueEditable(true)}
            />
            <ActionButton
              svgName="stop"
              tooltip="Stop All"
              onClick={() => setAllWebtoonsStatus(DownloadStatus.STOPPED)}
            />
            <ActionButton
              svgName="pause"
              tooltip="Pause All"
              onClick={() => setAllWebtoonsStatus(DownloadStatus.PAUSED)}
            />
            <ActionButton
              svgName="start"
              tooltip="Start All"
              onClick={() => setAllWebtoonsStatus(DownloadStatus.STARTED)}
            />
            <ActionButton
              svgName="trash"
              tooltip="Delete All"
              onClick={removeAllWebtoonsFromQueue}
            />
          </div>
        ) : (
          <div className="manage-btn">
            <ActionButton
              svgName="delete"
              tooltip="Discard"
              onClick={discardChanges}
            />
            <ActionButton
              svgName="done"
              tooltip="Apply"
              onClick={confirmChanges}
            />
          </div>
        )}
      </div>
      <div className="queue-list">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={queu.map((item) => item.id)}
            strategy={verticalListSortingStrategy}
          >
            <ul className="ul-queue">
              {queu.map((webtoon) => (
                <SortableItem
                  key={webtoon.id}
                  id={webtoon.id}
                  disabled={!queueEditable}
                >
                  <QCard
                    webtoon={webtoon}
                    removeWebtoonFromQueue={removeWebtoonFromQueue}
                    setWebtoonStatus={setWebtoonStatus}
                  />
                </SortableItem>
              ))}
            </ul>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  );
}

function SortableItem({ id, disabled, children }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <li ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {children}
    </li>
  );
}
