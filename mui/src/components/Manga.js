import "./../App.css";
import React, { useState, useEffect } from "react";
import "./Webtoon.css";
import Infoed from "./../components/infoed";
import get_info from "../api/get_info";

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
          <Infoed
            title=""
            info={
              <>
                {webtoon.Rating}
                <span className="fa fa-star checked rate"></span>
              </>
            }
          />
          <Infoed title="Status:" info={webtoon.Status} />
        </div>
        <div className="flex-item">
          <div className="title-sec">
            <div className="title">{webtoon.Title}</div>
            <div className="alternatives">{webtoon.Alternative}</div>
          </div>
          <div className="summary-sec">
            <Infoed title="Summary:" info={webtoon.Summary} />
          </div>
          <div className="info-sec">
            <Infoed title="Authors:" info={webtoon.Authors} />
            <Infoed title="Artists:" info={webtoon.Artists} />
            <Infoed title="Posted On:" info={webtoon["Posted On"]} />
            <Infoed title="Updated On:" info={webtoon["Updated On"]} />
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
