import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  getDate,
  getDateTime,
  retrieveImage,
  chunkArray,
  getInfo,
  getChapters,
} from "../utils";
import {
  Infoed,
  FlipButton,
  Rating,
  Loading,
  ChapterButton,
  DownloadButton,
  PushButton,
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

  const showHideModal = (isShow) => {
    const modal = document.getElementById("lib-modal");
    modal.style.display = isShow ? "block" : "none";
  };

  const addChapter = (chapter, status) => {
    const webt = {
      type: "manga",
      id: `${id}_$_${chapter.url}`,
      title: webtoon.Title,
      info: chapter.name,
      module: module,
      manga: url,
      chapter: chapter.url,
      status: status,
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
    } else showHideModal(true);
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
      showHideModal(false);
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
          {webtoon.Rating ? <Rating webtoon={webtoon} /> : <></>}
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
            onClick={() => addAllChapters("Started")}
          />
          <DownloadButton
            label="Add All Chapters to Queue"
            onClick={() => addAllChapters("Not Started")}
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
      <div id="lib-modal" className="modal">
        <div className="modal-content">
          <button
            className="buttonh closeBtn"
            onClick={() => showHideModal(false)}
          >
            <img alt="" src="./assets/delete.svg" className="icon"></img>
          </button>
          <div className="title">Add manga to library</div>
          <br />
          <div>
            Please enter a title for the manga you want to add to your library.
            <br />
            You can use the original title of the manga if there isn't any manga
            with the same title in your library.
          </div>
          <br />
          <input
            placeholder="Enter a title"
            className="input"
            name="text"
            type="text"
            value={mangaTitleForLibrary}
            onChange={(e) => setMangaTitleForLibrary(e.target.value)}
          ></input>
          <PushButton label="Ok" onClick={handleAddMangaToLibrary} />
          <PushButton label="Cancel" onClick={() => showHideModal(false)} />
          <br />
          <span id="pwmessage"></span>
        </div>
      </div>
    </div>
  ) : (
    <div className="container">
      <Loading />
    </div>
  );
}
