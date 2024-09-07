import { attemptToDownload } from "../operators";
import { Wcard, HomeButton } from "../components";
import { useQueueStore, useLibraryStore, useNotificationStore } from "../store";
import { chunkArray, getChapters, DownloadStatus, WebtoonType } from "../utils";

export default function Library() {
  const { addToQueueBulk } = useQueueStore();
  const { library } = useLibraryStore();
  const { addSuccessNotification } = useNotificationStore();
  const chunkedWebtoons = chunkArray(library, 3);

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
            onClick={() => {
              if (library.length > 0) library.forEach(updateSingle);
            }}
          />
        </div>
        <div className="card-row-container">
          {chunkedWebtoons.map((chunk, index) => (
            <div key={index} className="card-row">
              {chunk.map((webtoon) => (
                <div key={webtoon.title} className="card-wrapper">
                  <Wcard webtoon={webtoon} update={updateSingle} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
