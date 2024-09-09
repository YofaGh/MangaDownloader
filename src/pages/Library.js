import { attemptToDownload } from "../operators";
import { Wcard, HomeButton } from "../components";
import { getChapters, DownloadStatus, WebtoonType } from "../utils";
import { useQueueStore, useLibraryStore, useNotificationStore } from "../store";

export default function Library() {
  const { library } = useLibraryStore();
  const addToQueueBulk = useQueueStore((state) => state.addToQueueBulk);
  const addSuccessNotification = useNotificationStore(
    (state) => state.addSuccessNotification
  );

  const updateSingle = async (webtoon) => {
    const allChapters = await getChapters(webtoon.domain, webtoon.url);
    let chaptersToDownload = [];
    if (webtoon.last_downloaded_chapter) {
      let reached_last_downloaded_chapter = false;
      for (const chapter of allChapters) {
        if (chapter.url === webtoon.last_downloaded_chapter.url) {
          reached_last_downloaded_chapter = true;
          continue;
        }
        if (reached_last_downloaded_chapter) chaptersToDownload.push(chapter);
      }
    } else chaptersToDownload = allChapters;
    addToQueueBulk(
      chaptersToDownload.map((chapter) => ({
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
    addSuccessNotification(`Added all chapters of ${webtoon.title} to queue`);
    attemptToDownload(webtoon);
  };

  return (
    <div>
      <div className="container">
        <div className="top-header">
          Library
          <HomeButton
            svgName="download"
            label="Update All"
            onClick={() => library.forEach(updateSingle)}
          />
        </div>
        <div className="f-container">
          {library.map((webtoon) => (
            <Wcard
              webtoon={webtoon}
              key={webtoon.title}
              update={updateSingle}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
