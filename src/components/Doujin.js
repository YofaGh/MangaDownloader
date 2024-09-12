import { useState } from "react";
import { attemptToDownload } from "../operators";
import { useQueueStore, useNotificationStore } from "../store";
import { getInfo, WebtoonType, DownloadStatus } from "../utils";
import {
  Icon,
  Image,
  Infoed,
  Loading,
  FlipButton,
  DownloadButton,
  FavoriteButton,
} from ".";

export default function Doujin({ url, module }) {
  const { addToQueue } = useQueueStore();
  const [webtoon, setWebtoon] = useState(null);
  (async () => setWebtoon(await getInfo(module, url)))();
  const addSuccessNotification = useNotificationStore(
    (state) => state.addSuccessNotification
  );

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

  return webtoon ? (
    <div className="container">
      <div className="basic-info">
        <div className="fixed">
          <Image className="webtoon-i" src={webtoon.Cover} domain={module} />
          {webtoon.Rating && (
            <div>
              {webtoon.Rating}
              <Icon svgName="star" className="icongt" />
            </div>
          )}
        </div>
        <div className="flex-item">
          <div className="title-sec">
            <div className="title">
              {webtoon.Title}
              <FavoriteButton
                id={`${WebtoonType.DOUJIN}_$_${module}_$_${url}`}
                title={webtoon.Title}
                cover={webtoon.Cover}
              />
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
