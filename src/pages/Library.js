import { Wcard, HomeButton } from "../components";
import { useSheller } from "../ShellerProvider";

export default function Library({
  library,
  addLibraryMessage,
  addWebtoonToQueue,
}) {
  const sheller = useSheller();
  const chunkArray = (array, size) => {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
  };

  const updateSingle = async (webtoon) => {
    const allChapters = await sheller([
      "get_chapters",
      webtoon.domain,
      webtoon.url,
    ]);
    let chaptersToDownload = [];
    if (webtoon.last_downloaded_chapter) {
      let reached_last_downloaded_chapter = false;
      for (const chapter of allChapters) {
        if (chapter.url === webtoon.last_downloaded_chapter.url) {
          reached_last_downloaded_chapter = true;
          continue;
        }
        if (
          reached_last_downloaded_chapter &&
          !chaptersToDownload.includes(chapter)
        ) {
          chaptersToDownload.push(chapter);
        }
      }
    } else {
      chaptersToDownload = chaptersToDownload.concat(allChapters);
    }
    for (const chapter of chaptersToDownload) {
      addWebtoonToQueue({
        type: "manga",
        id: `${webtoon.domain}_$_${webtoon.url}_$_${chapter.url}`,
        title: webtoon.title,
        info: chapter.name,
        module: webtoon.domain,
        manga: webtoon.url,
        chapter: chapter.url,
        in_library: true,
        status: "Started",
      });
    }
  };

  const updateAll = async () => {
    for (const webtoon of library) {
      updateSingle(webtoon);
    }
  };

  const chunkedWebtoons = chunkArray(library, 3);

  return (
    <div>
      <div className="container">
        <div className="top-header">
          Library
          <HomeButton
            svg="./assets/download.svg"
            label="Update All"
            onClick={updateAll}
          />
        </div>
        <div className="card-row-container">
          {chunkedWebtoons.map((chunk, index) => (
            <div key={index} className="card-row">
              {chunk.map((webtoon) => (
                <div key={webtoon.title} className="card-wrapper">
                  <Wcard
                    webtoon={webtoon}
                    addLibraryMessage={addLibraryMessage}
                    update={updateSingle}
                  />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
