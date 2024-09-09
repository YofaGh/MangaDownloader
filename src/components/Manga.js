import { useState, useEffect } from "react";
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
  Rating,
  Loading,
  FlipButton,
  ChapterButton,
  DownloadButton,
  AddToLibraryModal,
} from ".";

export default function Manga({
  url,
  module,
  favoritesSvg,
  toggleFavoriteWebtoon,
}) {
  const navigate = useNavigate();
  const id = `${module}_$_${url}`;
  const [webtoon, setWebtoon] = useState({});
  const [chapters, setChapters] = useState([]);
  const { addToQueue, addToQueueBulk } = useQueueStore();
  const [webtoonLoaded, setWebtoonLoaded] = useState(false);
  const [chaptersLoaded, setChaptersLoaded] = useState(false);
  const [mangaTitleForLibrary, setMangaTitleForLibrary] = useState("");
  const { library, addToLibrary, removeFromLibrary } = useLibraryStore();
  const isInLibrary = library.some((webtoon) => webtoon.id === id);
  const addSuccessNotification = useNotificationStore(
    (state) => state.addSuccessNotification
  );

  useEffect(() => {
    (async () => {
      const response = await getInfo(module, url);
      setWebtoon(response);
      setWebtoonLoaded(true);
      setMangaTitleForLibrary(response.Title);
      const chapters = await getChapters(module, url);
      setChapters(chapters);
      setChaptersLoaded(true);
    })();
  }, [module, url]);

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
    addToQueue(webt);
    addSuccessNotification(`Added ${webt.title} - ${chapter.name} to queue`);
    if (status === DownloadStatus.STARTED) attemptToDownload(webt);
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
    addSuccessNotification(`Added all chapters of ${webtoon.Title} to queue`);
    if (status === DownloadStatus.STARTED) attemptToDownload();
  };

  const updateLibrary = async () => {
    if (isInLibrary) {
      const webt = library.find((item) => item.id === id);
      removeFromLibrary(id);
      addSuccessNotification(`Removed ${webt.title} from Library`);
    } else showHideModal("lib-modal", true);
  };

  const handleAddMangaToLibrary = () => {
    if (
      library.some((manga) => manga.title === mangaTitleForLibrary) ||
      !mangaTitleForLibrary
    ) {
      let errorMessage = "Enter a valid name.";
      const errorField = document.getElementById("pwmessage");
      if (mangaTitleForLibrary)
        errorMessage = "A manga with this title is already in your library.";
      errorField.innerText = errorMessage;
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
        <Icon svgName="goto" style={{ rotate: "180deg" }} />
      </button>
      <div className="basic-info">
        <div className="fixed">
          <Image className="webtoon-i" src={webtoon.Cover} domain={module} />
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
                  toggleFavoriteWebtoon(webtoon.Title, webtoon.Cover)
                }
              >
                <Icon svgName={favoritesSvg} className="icongt" />
              </button>
              <button className="buttonht" onClick={updateLibrary}>
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
            <div style={{ display: "inline-flex" }}>
              {webtoon.Dates &&
                Object.entries(webtoon.Dates).map(([key, value]) => (
                  <FlipButton key={key} label={key} datetime={value} />
                ))}
            </div>
          </div>
        </div>
      </div>
      {chaptersLoaded ? (
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
            {chapters.reverse().map((chapter) => (
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
