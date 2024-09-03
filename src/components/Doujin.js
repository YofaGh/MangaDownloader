import { useState, useEffect } from "react";
import { Infoed, FlipButton, DownloadButton, Loading, Rating } from ".";
import {
  getDate,
  getDateTime,
  retrieveImage,
  getInfo,
  DownloadStatus,
  WebtoonType,
  attemptToDownload,
} from "../utils";
import {
  useSettingsStore,
  useQueueStore,
  useNotificationStore,
} from "../store";

export default function Doujin({ module, url, favoritesSvg, updateWebtoon }) {
  const [webtoon, setWebtoon] = useState({});
  const [webtoonLoaded, setWebtoonLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState("");
  const { load_covers } = useSettingsStore((state) => state.settings);
  const { addToQueue } = useQueueStore();
  const { addSuccessNotification } = useNotificationStore();

  useEffect(() => {
    (async () => {
      const response = await getInfo(module, url);
      setWebtoon(response);
      setWebtoonLoaded(true);
      setImageSrc(load_covers ? response.Cover : "./assets/default-cover.svg");
    })();
  }, [load_covers, module, url]);

  const addDoujin = (status) => {
    const webt = {
      type: WebtoonType.DOUJIN,
      id: `${module}_$_${url}_$_`,
      title: webtoon.Title,
      info: url,
      module: module,
      doujin: url,
      status,
    };
    addToQueue(webt);
    addSuccessNotification(`Added ${webt.title} to queue`);
    if (status === DownloadStatus.STARTED) attemptToDownload();
  };

  return webtoonLoaded ? (
    <div className="container">
      <div className="basic-info">
        <div className="fixed">
          <img
            className="webtoon-i"
            alt=""
            src={imageSrc}
            onError={() => retrieveImage(imageSrc, module, setImageSrc)}
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
                <img alt="" src={favoritesSvg} className="icongt"></img>
                {webtoon.Rating && <Rating rating={webtoon.Rating} />}
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
          onClick={() => addDoujin(DownloadStatus.STARTED)}
        />
        <DownloadButton
          label="Add Doujin to Queue"
          onClick={() => addDoujin(DownloadStatus.STOPPED)}
        />
      </div>
    </div>
  ) : (
    <div className="container">
      <Loading />
    </div>
  );
}
