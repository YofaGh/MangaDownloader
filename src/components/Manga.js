import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { attemptToDownload } from "../operators";
import { useQueueStore, useLibraryStore, useNotificationStore } from "../store";
import {
  getInfo,
  getChapters,
  WebtoonType,
  showHideModal,
  DownloadStatus,
} from "../utils";
import {
  Icon,
  Image,
  Infoed,
  Loading,
  FlipButton,
  ChapterButton,
  DownloadButton,
  FavoriteButton,
  AddToLibraryModal,
} from ".";

export default function Manga({ url, module }) {
  const navigate = useNavigate();
  const id = `${module}_$_${url}`;
  const [webtoon, setWebtoon] = useState(null);
  const [chapters, setChapters] = useState(null);
  const { addToQueue, addToQueueBulk } = useQueueStore();
  const { library, removeFromLibrary } = useLibraryStore();
  const isInLibrary = library.some((webtoon) => webtoon.id === id);
  const notifySuccess = useNotificationStore((state) => state.notifySuccess);
  (async () => {
    setWebtoon(await getInfo(module, url));
    setChapters(await getChapters(module, url));
  })();

  const addChapter = (chapter, status) => {
    addToQueue({
      type: WebtoonType.MANGA,
      id: `${id}_$_${chapter.url}`,
      title: webtoon.Title,
      info: chapter.name,
      module,
      manga: url,
      chapter: chapter.url,
      status,
    });
    notifySuccess(`Added ${webtoon.Title} - ${chapter.name} to queue`);
    if (status === DownloadStatus.STARTED) attemptToDownload();
  };

  const addAllChapters = (status) => {
    addToQueueBulk(
      chapters.reverse().map((chapter) => ({
        type: WebtoonType.MANGA,
        id: `${id}_$_${chapter.url}`,
        title: webtoon.Title,
        info: chapter.name,
        module,
        manga: url,
        chapter: chapter.url,
        status,
      }))
    );
    notifySuccess(`Added all chapters of ${webtoon.Title} to queue`);
    if (status === DownloadStatus.STARTED) attemptToDownload();
  };

  const updateLibrary = async () => {
    if (isInLibrary) {
      const webt = library.find((item) => item.id === id);
      removeFromLibrary(id);
      notifySuccess(`Removed ${webt.title} from Library`);
    } else showHideModal("lib-modal", true);
  };

  return webtoon ? (
    <div className="container">
      <button
        className="buttonh buttonht"
        onClick={() => navigate(-1)}
        style={{ marginTop: "50px", marginRight: "auto", marginLeft: "50px" }}
      >
        <Icon svgName="goto" style={{ rotate: "180deg" }} />
      </button>
      <div className="basic-info">
        <div className="fixed">
          <Image className="webtoon-i" src={webtoon.Cover} domain={module} />
          {webtoon.Rating && (
            <div>
              {webtoon.Rating}
              <Icon svgName="star" className="icongt" />
            </div>
          )}
          <Infoed title="Status:" info={webtoon.Status} />
        </div>
        <div className="flex-item">
          <div className="title-sec">
            <div className="title">
              {webtoon.Title}
              <FavoriteButton
                id={`${WebtoonType.MANGA}_$_${module}_$_${url}`}
                title={webtoon.Title}
                cover={webtoon.Cover}
              />
              <button className="buttonh buttonht" onClick={updateLibrary}>
                <Icon svgName={isInLibrary ? "library" : "add_to_library"} />
              </button>
            </div>
            <div className="alternatives">{webtoon.Alternative}</div>
          </div>
          <div className="summary-sec">
            <div className="title-info">Summary: </div>
            {webtoon.Summary}
          </div>
          <div className="info-sec">
            {webtoon.Extras &&
              Object.entries(webtoon.Extras).map(([key, value]) => (
                <Infoed key={key} title={`${key}:`} info={value} />
              ))}
            <div className="display-inline-flex">
              {webtoon.Dates &&
                Object.entries(webtoon.Dates).map(([key, value]) => (
                  <FlipButton key={key} label={key} datetime={value} />
                ))}
            </div>
          </div>
        </div>
      </div>
      {chapters ? (
        <div className="f-container">
          <DownloadButton
            label="Download All Chapters"
            onClick={() => addAllChapters(DownloadStatus.STARTED)}
          />
          <DownloadButton
            label="Add All Chapters to Queue"
            onClick={() => addAllChapters(DownloadStatus.STOPPED)}
          />
          <br />
          <br />
          <div className="f-container">
            {chapters.map((chapter) => (
              <ChapterButton
                key={chapter.url}
                chapter={chapter}
                addChapter={addChapter}
              />
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p>Loading Chapters</p>
          <Loading />
        </div>
      )}
      <AddToLibraryModal webtoon={webtoon} domain={module} url={url} />
    </div>
  ) : (
    <div className="container">
      <Loading />
    </div>
  );
}
