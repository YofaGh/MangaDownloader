import "./../App.css";
import React, { useState, useEffect } from "react";
import "../styles/Webtoon.css";
import Infoed from "./../components/infoed";
import get_info from "../api/get_info";
import get_chapters from "../api/get_chapters";
import FlipButton from "./FlipButton";
import Rating from "./Rating";
import { getDate, getDateTime, filterDict } from "./extras";
import Loading from "./Loading";
import "../styles/infoed.css";
import ChapterButton from "./ChapterBotton";

const Manga = ({ module, url, addWebtoon, isFavorite, updateWebtoon }) => {
  const [webtoon, setWebtoon] = useState({});
  const [webtoonLoaded, setWebtoonLoaded] = useState(false);
  const [loadingChapters, setLoadingChapters] = useState(true);
  const [imageHeight, setImageHeight] = useState(0);
  const [chapters, setChapters] = useState([]);
  const imageWidth = 200;

  useEffect(() => {
    const fetchManga = async () => {
      const response = await get_info(module, url);
      setWebtoon(response);
      setWebtoonLoaded(true);
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

  const addManga = (chapter, status) => {
    addWebtoon({
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
      )}
    </div>
  ) : (
    <></>
  );
};

export default Manga;
