import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDate,
  getDateTime,
  retrieveImage,
  chunkArray,
  getInfo,
  getChapters,
  DownloadStatus,
  WebtoonType,
  showHideModal,
} from "../utils";
import {
  Infoed,
  FlipButton,
  Rating,
  Loading,
  ChapterButton,
  DownloadButton,
  AddToLibraryModal,
} from ".";
import {
  useSettingsStore,
  useQueueStore,
  useLibraryStore,
  useNotificationStore,
  useDownloadingStore,
} from "../store";

export default function Manga({ module, url, favoritesSvg, updateWebtoon }) {
  const [webtoon, setWebtoon] = useState({});
  const [webtoonLoaded, setWebtoonLoaded] = useState(false);
  const [chaptersLoaded, setChaptersLoaded] = useState(false);
  const [mangaTitleForLibrary, setMangaTitleForLibrary] = useState("");
  const [chapters, setChapters] = useState([]);
  const [imageSrc, setImageSrc] = useState("");
  const navigate = useNavigate();
  const { load_covers } = useSettingsStore((state) => state.settings);
  const { queue, addToQueue, updateItemInQueue } = useQueueStore();
  const { addSuccessNotification } = useNotificationStore();
  const { library, addToLibrary, removeFromLibrary } = useLibraryStore();
  const { downloading, clearDownloading, setStopRequested } =
    useDownloadingStore();
  const id = `${module}_$_${url}`;
  const isInLibrary = library.some((webtoon) => webtoon.id === id);

  useEffect(() => {
    (async () => {
      const response = await getInfo(module, url);
      setWebtoon(response);
      setWebtoonLoaded(true);
      setMangaTitleForLibrary(response.Title);
      setImageSrc(load_covers ? response.Cover : "./assets/default-cover.svg");
      const chapters = await getChapters(module, url);
      setChapters(chapters);
      setChaptersLoaded(true);
    })();
  }, [load_covers, module, url]);

  const addChapter = (chapter, status) => {
    const webt = {
      type: WebtoonType.MANGA,
      id: `${id}_$_${chapter.url}`,
      title: webtoon.Title,
      info: chapter.name,
      module,
      manga: url,
      chapter: chapter.url,
      status,
    };
    if (!queue.find((item) => item.id === webt.id)) {
      addToQueue(webt);
      addSuccessNotification(`Added ${webt.title} - ${chapter.name} to queue`);
    } else {
      updateItemInQueue(webt);
      addSuccessNotification(
        `Updated ${webt.title} - ${chapter.name} in queue`
      );
    }
  };

  const addAllChapters = (status) =>
    chapters.forEach((chapter) => addChapter(chapter, status));

  const updateLibrary = async () => {
    if (isInLibrary) {
      const webt = library.find((item) => item.id === id);
      removeFromLibrary(id);
      addSuccessNotification(`Removed ${webt.title} from Library`);
      if (downloading && webt.id === downloading.id) {
        setStopRequested(true);
        clearDownloading();
      }
    } else showHideModal("lib-modal", true);
  };

  const handleAddMangaToLibrary = () => {
    if (library.some((manga) => manga.title === mangaTitleForLibrary)) {
      const errorField = document.getElementById("pwmessage");
      errorField.innerText =
        "A manga with this title is already in your library.";
      errorField.style.color = "red";
    } else {
      addToLibrary({
        title: mangaTitleForLibrary,
        id,
        enabled: true,
        domain: module,
        url,
        cover: webtoon.Cover,
        last_downloaded_chapter: null,
      });
      addSuccessNotification(`Added ${mangaTitleForLibrary} to library`);
      showHideModal("lib-modal", false);
    }
  };

  return webtoonLoaded ? (
    <div className="container">
      <button
        className="buttonht"
        onClick={() => navigate(-1)}
        style={{ marginTop: "50px", marginRight: "auto", marginLeft: "50px" }}
      >
        <img
          alt=""
          src="./assets/goto.svg"
          className="icon"
          style={{ rotate: "180deg" }}
        ></img>
      </button>
      <div className="basic-info">
        <div className="fixed">
          <img
            className="webtoon-i"
            alt=""
            src={imageSrc}
            onError={() => retrieveImage(imageSrc, module, setImageSrc)}
          ></img>
          {webtoon.Rating && <Rating rating={webtoon.Rating} />}
          <Infoed title="Status:" info={webtoon.Status} />
        </div>
        <div className="flex-item">
          <div className="title-sec">
            <div className="title">
              {webtoon.Title}
              <button
                className="buttonht"
                onClick={() =>
                  updateWebtoon({
                    title: webtoon.Title,
                    cover: webtoon.Cover,
                  })
                }
              >
                <img alt="" src={favoritesSvg} className="icongt"></img>
              </button>
              <button className="buttonht" onClick={updateLibrary}>
                <img
                  alt=""
                  src={
                    isInLibrary
                      ? "./assets/library.svg"
                      : "./assets/add_to_library.svg"
                  }
                  className="icon"
                ></img>
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
            <div style={{ display: "inline-flex" }}>
              {webtoon.Dates &&
                Object.entries(webtoon.Dates).map(([key, value]) => (
                  <FlipButton
                    key={key}
                    frontText={
                      <div>
                        {key}
                        <br />
                        {getDate(value)}
                      </div>
                    }
                    backText={getDateTime(value)}
                  />
                ))}
            </div>
          </div>
        </div>
      </div>
      {chaptersLoaded ? (
        <div>
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
          <div>
            {chunkArray(chapters.reverse(), 3).map((chunk, index) => (
              <div key={index} className="card-row">
                {chunk.map((chapter) => (
                  <div key={chapter.url} className="card-wrapper">
                    <ChapterButton chapter={chapter} addChapter={addChapter} />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <p>Loading Chapters</p>
          <Loading />
        </div>
      )}
      <AddToLibraryModal
        mangaTitleForLibrary={mangaTitleForLibrary}
        setMangaTitleForLibrary={setMangaTitleForLibrary}
        handleAddMangaToLibrary={handleAddMangaToLibrary}
      />
    </div>
  ) : (
    <div className="container">
      <Loading />
    </div>
  );
}
