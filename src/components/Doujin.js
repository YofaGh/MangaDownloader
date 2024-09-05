import { useState, useEffect } from "react";
import { attemptToDownload } from "../operators";
import { useQueueStore, useNotificationStore } from "../store";
import {
  Infoed,
  FlipButton,
  DownloadButton,
  Loading,
  Rating,
  Image,
  Icon,
} from ".";
import {
  getDate,
  getDateTime,
  getInfo,
  DownloadStatus,
  WebtoonType,
} from "../utils";

export default function Doujin({ module, url, favoritesSvg, updateWebtoon }) {
  const [webtoon, setWebtoon] = useState({});
  const [webtoonLoaded, setWebtoonLoaded] = useState(false);
  const { addToQueue } = useQueueStore();
  const { addSuccessNotification } = useNotificationStore();

  useEffect(() => {
    (async () => {
      const response = await getInfo(module, url);
      setWebtoon(response);
      setWebtoonLoaded(true);
    })();
  }, [module, url]);

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
          <Image className="webtoon-i" src={webtoon.Cover} domain={module} />
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
                <Icon svgName={favoritesSvg} className="icongt" />
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
