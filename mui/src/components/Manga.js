import "./../App.css";
import React, { useState, useEffect } from "react";
import "../styles/Webtoon.css";
import Infoed from "./../components/infoed";
import get_info from "../api/get_info";
import get_chapters from "../api/get_chapters";
import FlipButton from "./FlipButton";
import Rating from "./Rating";
import { getDate, getDateTime, filterDict } from "./utils";
import Loading from "./Loading";
import "../styles/infoed.css";
import ChapterButton from "./ChapterBotton";
import PushButton from "./PushButton";

const Manga = ({
  module,
  url,
  addWebtoonToQueue,
  isFavorite,
  updateWebtoon,
  addLibraryMessage,
  isInLibrary,
  library,
}) => {
  const [webtoon, setWebtoon] = useState({});
  const [webtoonLoaded, setWebtoonLoaded] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [imageHeight, setImageHeight] = useState(0);
  const [mangaTitleForLibrary, setMangaTitleForLibrary] = useState("");
  const [chapters, setChapters] = useState([]);
  const imageWidth = 200;

  useEffect(() => {
    const fetchManga = async () => {
      const response = await get_info(module, url);
      setWebtoon(response);
      setWebtoonLoaded(true);
      setMangaTitleForLibrary(response.Title);
    };
    fetchManga();
  }, [module, url]);

  useEffect(() => {
    const calculateImageHeight = () => {
      const image = new Image();
      image.src = webtoon.Cover;
      image.onload = () => {
        const aspectRatio = image.width / image.height;
        const calculatedHeight = imageWidth / aspectRatio;
        setImageHeight(calculatedHeight);
      };
    };

    if (webtoon.Cover) {
      calculateImageHeight();
    }
  }, [webtoon.Cover]);

  useEffect(() => {
    const get_chapterss = async () => {
      const response = await get_chapters(module, url);
      setChapters(response);
      setLoadingChapters(false);
    };
    get_chapterss();
  }, [module, url]);

  const fixedStyle = {
    width: `${imageWidth}px`,
    height: `${imageHeight}px`,
    backgroundImage: `url(${webtoon.Cover})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  const chunkArray = (array, size) => {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
  };

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
      // addLibraryMessage({
      //   addWebtoon: {
      //     webtoon: {
      //       title: webtoon.Title,
      //       status: true,
      //       domain: module,
      //       url,
      //       cover: webtoon.Cover,
      //       last_downloaded_chapter: null,
      //     },
      //   },
      // });
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
      <div className="basic-info">
        <div className="fixed">
          <div className="fixed" style={fixedStyle}></div>
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
            {Object.entries(
              filterDict(webtoon, [
                "Title",
                "Alternative",
                "Cover",
                "Status",
                "Summary",
                "Rating",
                "Posted On",
                "Updated On",
              ])
            ).map(([key, value]) => (
              <Infoed title={`${key}:`} info={value} />
            ))}
            <div style={{ display: "inline-flex" }}>
              <FlipButton
                frontText={
                  <div>
                    Updated On:
                    <br />
                    {getDate(webtoon["Updated On"])}
                  </div>
                }
                backText={getDateTime(webtoon["Updated On"])}
              />
              <FlipButton
                frontText={
                  <div>
                    Posted On:
                    <br />
                    {getDate(webtoon["Posted On"])}
                  </div>
                }
                backText={getDateTime(webtoon["Posted On"])}
              />
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
            {chunkArray(chapters, 3).map((chunk, index) => (
              <div key={index} className="card-row">
                {chunk.map((chapter) => (
                  <div key={webtoon} className="card-wrapper">
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
    <></>
  );
};

export default Manga;
