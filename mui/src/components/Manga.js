import "./../App.css";
import React, { useState, useEffect } from "react";
import "./Webtoon.css";
import Infoed from "./../components/infoed";
import get_info from "../api/get_info";
import FlipButton from "./FlipButton";
import Rating from "./Rating";
import { getDate, getDateTime, filterDict } from "./extras";
import "./infoed.css";

const Manga = ({ module, url }) => {
  const [webtoon, setWebtoon] = useState({});
  const [webtoonLoaded, setWebtoonLoaded] = useState(false);
  const [chaptersLoaded, setChaptersLoaded] = useState(false);
  const [imageHeight, setImageHeight] = useState(0);
  const imageWidth = 200;

  const loadChapters = () => {
    setChaptersLoaded(true);
  };

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

  const fixedStyle = {
    width: `${imageWidth}px`,
    height: `${imageHeight}px`,
    backgroundImage: `url(${webtoon.Cover})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  return webtoonLoaded ? (
    <div className="container">
      <div className="basic-info">
        <div className="fixed">
          <div className="fixed" style={fixedStyle}></div>
          {webtoon.Rating ? (
            <Rating webtoon={webtoon}/>
          ) : (
            <></>
          )}
          <Infoed title="Status:" info={webtoon.Status} />
        </div>
        <div className="flex-item">
          <div className="title-sec">
            <div className="title">{webtoon.Title}</div>
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
      {chaptersLoaded ? (
        <></>
      ) : (
        <button onClick={loadChapters}>Load Chapters</button>
      )}
    </div>
  ) : (
    <></>
  );
};

export default Manga;
