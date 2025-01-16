import { attemptToDownload } from "../operators";
import { Wcard, Icon } from "../components";
import { getChapters, DownloadStatus, WebtoonType } from "../utils";
import { useQueueStore, useLibraryStore, useNotificationStore } from "../store";

export default function Library() {
  const { library } = useLibraryStore();
  const addToQueueBulk = useQueueStore((state) => state.addToQueueBulk);
  const { notifyError, notifySuccess } = useNotificationStore();

  const updateWebtoonLibrary = async (webtoon) => {
    const allChapters = await getChapters(webtoon.domain, webtoon.url);
    if (allChapters.length === 0) {
      notifyError(`${webtoon.title} had zero chapters`);
      return;
    }
    const chs = webtoon.last_downloaded_chapter
      ? allChapters.slice(
          allChapters.findIndex(
            (chapter) => chapter.url === webtoon.last_downloaded_chapter.url
          ) + 1
        )
      : allChapters;
    addToQueueBulk(
      chs.map((chapter) => ({
        type: WebtoonType.MANGA,
        id: `${webtoon.domain}_$_${webtoon.url}_$_${chapter.url}`,
        title: webtoon.title,
        info: chapter.name,
        module: webtoon.domain,
        manga: webtoon.url,
        chapter: chapter.url,
        inLibrary: true,
        status: DownloadStatus.STARTED,
      }))
    );
    notifySuccess(`Added ${chs.length} chapters of ${webtoon.title} to queue`);
    attemptToDownload();
  };

  const updateAllWebtoons = async () => {
    for (const webtoon of library) {
      await updateWebtoonLibrary(webtoon);
    }
  };

  return (
    <div>
      <div className="container">
        <div className="top-header">
          Library
          <button className="playstore-button" onClick={updateAllWebtoons}>
            <Icon svgName="download" className="iconn" />
            <span className="texts">
              <span className="text-2">Update All</span>
            </span>
          </button>
        </div>
        <div className="f-container">
          {library.map((webtoon) => (
            <Wcard
              webtoon={webtoon}
              key={webtoon.title}
              update={updateWebtoonLibrary}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
