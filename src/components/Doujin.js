import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Infoed, FlipButton, DownloadButton, Loading } from ".";
import { getDate, getDateTime, retrieveImage } from "../utils";
import {
  useSettingsStore,
  useQueueStore,
  useNotificationStore,
} from "../store";

export default function Doujin({ module, url, isFavorite, updateWebtoon }) {
  const [webtoon, setWebtoon] = useState({});
  const [webtoonLoaded, setWebtoonLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const { load_covers } = useSettingsStore((state) => state.settings);
  const { queue, addToQueue, updateItemInQueue } = useQueueStore();
  const { addSuccessNotification } = useNotificationStore();

  useEffect(() => {
    (async () => {
      const response = await invoke("get_info", { domain: module, url });
      setWebtoon(response);
      setWebtoonLoaded(true);
      setImageSrc(load_covers ? response.Cover : "./assets/default-cover.svg");
    })();
  }, [module, url]);

  const addDoujin = (status) => {
    const webt = {
      type: "doujin",
      id: `${module}_$_${url}`,
      title: webtoon.Title,
      info: url,
      module: module,
      doujin: url,
      status: status,
    };
    if (!queue.find((item) => item.id === webt.id)) {
      addToQueue(webt);
      addSuccessNotification(`Added ${webt.title} to queue`);
    } else {
      updateItemInQueue(webt);
      addSuccessNotification(`Updated ${webt.title} in queue`);
    }
  };

  return webtoonLoaded ? (
    <div className="container">
      <div className="basic-info">
        <div className="fixed">
          <img
            className="webtoon-i"
            alt=""
            src={imageSrc}
            onError={() =>
              retrieveImage(
                imageSrc,
                module,
                setImageSrc,
                "./assets/default-cover.svg"
              )
            }
          ></img>
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
        <DownloadButton
          label="Download Doujin"
          onClick={() => addDoujin("Started")}
        />
        <DownloadButton
          label="Add Doujin to Queue"
          onClick={() => addDoujin("Not Started")}
        />
      </div>
    </div>
  ) : (
    <div className="container">
      <Loading />
    </div>
  );
}
