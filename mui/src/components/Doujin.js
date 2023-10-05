import "./../App.css";
import React, { useState, useEffect } from "react";
import "./Webtoon.css";
import Infoed from "./../components/infoed";
import get_info from "../api/get_info";
import FlipButton from "./FlipButton";
import { getDate, getDateTime, filterDict } from "./extras";

const Doujin = ({ module, url, addWebtoon }) => {
  const [webtoon, setWebtoon] = useState({});
  const [webtoonLoaded, setWebtoonLoaded] = useState(false);
  const [imageHeight, setImageHeight] = useState(0);
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

  const fixedStyle = {
    width: `${imageWidth}px`,
    height: `${imageHeight}px`,
    backgroundImage: `url(${webtoon.Cover})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
  };

  const addDoujin = (status) => {
    addWebtoon({
      type: "doujin",
      id: `${module}_$_${url}`,
      title: webtoon.Title,
      info: url,
      module: module,
      doujin: url,
      status: status,
    });
  };

  return webtoonLoaded ? (
    <div className="container">
      <div className="basic-info">
        <div className="fixed">
          <div className="fixed" style={fixedStyle}></div>
        </div>
        <div className="flex-item">
          <div className="title-sec">
            <div className="title">{webtoon.Title}</div>
            <div className="alternatives">{webtoon.Alternative}</div>
          </div>
          <div className="info-sec">
            {Object.entries(
              filterDict(webtoon, [
                "Title",
                "Alternative",
                "Cover",
                "Pages",
                "Uploaded",
              ])
            ).map(([key, value]) => (
              <Infoed title={`${key}:`} info={value} />
            ))}
            <Infoed title="Pages:" info={webtoon.Pages} />
            <FlipButton
              frontText={
                <div>
                  Uploaded:
                  <br />
                  {getDate(webtoon.Uploaded)}
                </div>
              }
              backText={getDateTime(webtoon.Uploaded)}
            />
          </div>
        </div>
      </div>
      <div>
        <button className="btnn" onClick={() => addDoujin("Started")}>
          <span>Download Doujin</span>
          <div class="top"></div>
          <div class="left"></div>
          <div class="bottom"></div>
          <div class="right"></div>
        </button>
        <button className="btnn" onClick={() => addDoujin("Not Started")}>
          <span>Add Doujin to Queue</span>
          <div class="top"></div>
          <div class="left"></div>
          <div class="bottom"></div>
          <div class="right"></div>
        </button>
      </div>
    </div>
  ) : (
    <></>
  );
};

export default Doujin;
