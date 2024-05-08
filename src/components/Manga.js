import { useState, useEffect } from "react";
import {
  Infoed,
  FlipButton,
  Rating,
  getDate,
  getDateTime,
  Loading,
  ChapterButton,
  PushButton,
  retrieveImage,
  chunkArray
} from ".";
import { invoke } from "@tauri-apps/api/tauri";
import { useSettings } from "../Provider";
import { useNavigate } from "react-router-dom";

export default function Manga({
  module,
  url,
  addWebtoonToQueue,
  isFavorite,
  updateWebtoon,
  addLibraryMessage,
  isInLibrary,
  library,
}) {
  const [webtoon, setWebtoon] = useState({});
  const [webtoonLoaded, setWebtoonLoaded] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [mangaTitleForLibrary, setMangaTitleForLibrary] = useState("");
  const [chapters, setChapters] = useState([]);
  const [imageSrc, setImageSrc] = useState("");
  const navigate = useNavigate();
  const { load_covers } = useSettings();

  useEffect(() => {
    const fetchManga = async () => {
      invoke("get_info", { domain: module, url }).then((response) => {
        setWebtoon(response);
        setWebtoonLoaded(true);
        setMangaTitleForLibrary(response.Title);
        setImageSrc(load_covers ? response.Cover : "./assets/default-cover.svg");
      });
    };
    fetchManga();
  }, [module, url]);

  useEffect(() => {
    const get_chapterss = async () => {
      invoke("get_chapters", { domain: module, url }).then((response) => {
        setChapters(response);
        setLoadingChapters(false);
      });
    };
    get_chapterss();
  }, [module, url]);

  const showHideModal = (isShow) => {
    const modal = document.getElementById("lib-modal");
    modal.style.display = isShow ? "block" : "none";
  };

  const addManga = (chapter, status) => {
    addWebtoonToQueue({
      type: "manga",
      id: `${module}_$_${url}_$_${chapter.url}`,
      title: webtoon.Title,
      info: chapter.name,
      module: module,
      manga: url,
      chapter: chapter.url,
      status: status,
    });
  };

  const addAllChapters = (status) => {
    for (const chapter of chapters) {
      addManga(chapter, status);
    }
  };

  const updateLibrary = () => {
    if (isInLibrary) {
      addLibraryMessage({
        removeWebtoon: {
          domain: module,
          url,
        },
      });
    } else {
      showHideModal(true);
    }
  };

  const addMangaToLibrary = () => {
    addLibraryMessage({
      addWebtoon: {
        webtoon: {
          title: mangaTitleForLibrary,
          status: true,
          domain: module,
          url,
          cover: webtoon.Cover,
          last_downloaded_chapter: null,
        },
      },
    });
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
            onError={() => {
              retrieveImage(
                imageSrc,
                module,
                setImageSrc,
                invoke,
                "./assets/default-cover.svg"
              );
            }}
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
                onClick={() => {
                  updateWebtoon({
                    title: webtoon.Title,
                    cover: webtoon.Cover,
                  });
                }}
              >
                <img
                  alt=""
                  src={
                    isFavorite
                      ? "./assets/favorites.svg"
                      : "./assets/favorites-outlined.svg"
                  }
                  className="icongt"
                ></img>
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
            {Object.entries(webtoon.Extras).map(([key, value]) => (
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
      {loadingChapters ? (
        <div>
          Loading Chapters
          <Loading />
        </div>
      ) : (
        <div>
          <button className="btnn" onClick={() => addAllChapters("Started")}>
            <span>Download All Chapters</span>
            <div className="top"></div>
            <div className="left"></div>
            <div className="bottom"></div>
            <div className="right"></div>
          </button>
          <button
            className="btnn"
            onClick={() => addAllChapters("Not Started")}
          >
            <span>Add All Chapters to Queue</span>
            <div className="top"></div>
            <div className="left"></div>
            <div className="bottom"></div>
            <div className="right"></div>
          </button>
          <br />
          <br />
          <div>
            {chunkArray(chapters.reverse(), 3).map((chunk, index) => (
              <div key={index} className="card-row">
                {chunk.map((chapter) => (
                  <div key={chapter.url} className="card-wrapper">
                    <ChapterButton chapter={chapter} addManga={addManga} />
                  </div>
                ))}
              </div>
            ))}
          </div>
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
            placeholder={"Enter a title"}
            className="input"
            name="text"
            type="text"
            value={mangaTitleForLibrary}
            onChange={(e) => setMangaTitleForLibrary(e.target.value)}
          ></input>
          <PushButton
            label={"Ok"}
            onClick={() => {
              if (
                library.some((manga) => manga.title === mangaTitleForLibrary)
              ) {
                const errorField = document.getElementById("pwmessage");
                errorField.innerText =
                  "A manga with this title is already in your library.";
                errorField.style.color = "red";
              } else {
                addMangaToLibrary();
                showHideModal(false);
              }
            }}
          />
          <PushButton label={"Cancel"} onClick={() => showHideModal(false)} />
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
