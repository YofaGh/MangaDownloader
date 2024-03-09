import { useState, useEffect } from "react";
import { Infoed, FlipButton, getDate, getDateTime, retrieveImage, Loading } from ".";
import { useSheller, useSettings } from "../ShellerProvider";

export default function Doujin({
  module,
  url,
  addWebtoonToQueue,
  isFavorite,
  updateWebtoon,
}) {
  const [webtoon, setWebtoon] = useState({});
  const [webtoonLoaded, setWebtoonLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const sheller = useSheller();
  const { load_covers } = useSettings();

  useEffect(() => {
    const fetchManga = async () => {
      const response = await sheller(["get_info", module, url]);
      setWebtoon(response);
      setWebtoonLoaded(true);
      setImageSrc(
        load_covers ? response.Cover : "./assets/default-cover.svg"
      );
    };
    fetchManga();
  }, [module, url]);

  const addDoujin = (status) => {
    addWebtoonToQueue({
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
          <img
            className="webtoon-i"
            alt=""
            src={imageSrc}
            onError={() => {
              retrieveImage(imageSrc, module, setImageSrc, sheller, "./assets/default-cover.svg");
            }}
          ></img>
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
          <div className="info-sec">
            {Object.entries(webtoon.Extras).map(([key, value]) => (
              <Infoed title={`${key}:`} info={value} />
            ))}
            <Infoed title="Pages:" info={webtoon.Pages} />
            {webtoon.Dates &&
              Object.entries(webtoon.Dates).map(([key, value]) => (
                <FlipButton
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
      <div>
        <button className="btnn" onClick={() => addDoujin("Started")}>
          <span>Download Doujin</span>
          <div className="top"></div>
          <div className="left"></div>
          <div className="bottom"></div>
          <div className="right"></div>
        </button>
        <button className="btnn" onClick={() => addDoujin("Not Started")}>
          <span>Add Doujin to Queue</span>
          <div className="top"></div>
          <div className="left"></div>
          <div className="bottom"></div>
          <div className="right"></div>
        </button>
      </div>
    </div>
  ) : (
    <div className="container">
      <Loading />
    </div>
  );
}
