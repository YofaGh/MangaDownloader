import { useState, useEffect } from "react";
import { attemptToDownload } from "../operators";
import { useQueueStore, useNotificationStore } from "../store";
import { getInfo, WebtoonType, DownloadStatus } from "../utils";
import {
  Icon,
  Image,
  Rating,
  Infoed,
  Loading,
  FlipButton,
  DownloadButton,
} from ".";

export default function Doujin({
  url,
  module,
  favoritesSvg,
  toggleFavoriteWebtoon,
}) {
  const { addToQueue } = useQueueStore();
  const [webtoon, setWebtoon] = useState({});
  const [webtoonLoaded, setWebtoonLoaded] = useState(false);
  const addSuccessNotification = useNotificationStore(
    (state) => state.addSuccessNotification
  );

  useEffect(() => {
    (async () => {
      const response = await getInfo(module, url);
      setWebtoon(response);
      setWebtoonLoaded(true);
    })();
  }, [module, url]);

  const addDoujin = (status) => {
    addToQueue({
      type: WebtoonType.DOUJIN,
      id: `${module}_$_${url}_$_`,
      title: webtoon.Title,
      info: url,
      module: module,
      doujin: url,
      status,
    });
    addSuccessNotification(`Added ${webtoon.Title} to queue`);
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
                  toggleFavoriteWebtoon(webtoon.Title, webtoon.Cover)
                }
              >
                <Icon svgName={favoritesSvg} className="icongt" />
                {webtoon.Rating && <Rating rating={webtoon.Rating} />}
              </button>
            </div>
            <div className="alternatives">{webtoon.Alternative}</div>
          </div>
          <div className="info-sec">
            {webtoon.Extras &&
              Object.entries(webtoon.Extras).map(([key, value]) => (
                <Infoed title={`${key}:`} info={value} />
              ))}
            <Infoed title="Pages:" info={webtoon.Pages} />
            {webtoon.Dates &&
              Object.entries(webtoon.Dates).map(([key, value]) => (
                <FlipButton key={key} label={key} datetime={value} />
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
