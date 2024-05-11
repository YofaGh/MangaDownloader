import { Wcard, HomeButton, chunkArray } from "../components";
import { useSettings } from "../Provider";
import { invoke } from "@tauri-apps/api/core";

export default function Library({
  library,
  addLibraryMessage,
  addWebtoonToQueue,
}) {
  const { load_covers } = useSettings();

  const updateSingle = async (webtoon) => {
    const allChapters = await invoke("get_chapters", {
      domain: webtoon.domain,
      url: webtoon.url,
    });
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

  const chunkedWebtoons = chunkArray(library, 3);

  return (
    <div>
      <div className="container">
        <div className="top-header">
          Library
          <HomeButton
            svg="./assets/download.svg"
            label="Update All"
            onClick={() => {
              if (library.array.length > 0) {
                library.array.forEach(updateSingle);
              }
            }}
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
                    load_covers={load_covers}
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
