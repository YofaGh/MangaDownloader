import "./../App.css";
import React, { useState, useEffect } from "react";
import Wcard from "./../components/webtoonCard";

function LPage() {
  const [library, setLibrary] = useState([]);

  useEffect(() => {
    const libraryRaw = window.do.getJsonFile("library.json");
    setLibrary(
      Object.entries(libraryRaw).map(([manga, detm]) => {
        return {
          title: manga,
          status: detm.include,
          domain: detm.domain,
          url: detm.url,
          cover: detm.cover,
          last_downloaded_chapter: detm.last_downloaded_chapter,
          chapters: detm.chapters,
        };
      })
    );
  }, []);

  const updateLibrary = () => {
    window.do.setJsonFile(
      "library.json",
      library.reduce(
        (
          acc,
          {
            title,
            status,
            domain,
            url,
            cover,
            last_downloaded_chapter,
            chapters,
          }
        ) => {
          acc[title] = {
            include: status,
            domain,
            url,
            cover,
            last_downloaded_chapter,
            chapters,
          };
          return acc;
        },
        {}
      )
    );
  };

  const chunkArray = (array, size) => {
    const chunkedArray = [];
    for (let i = 0; i < array.length; i += size) {
      chunkedArray.push(array.slice(i, i + size));
    }
    return chunkedArray;
  };

  const chunkedWebtoons = chunkArray(library, 3);
  return (
    <div>
      <div className="container">
        <div className="top-header">Library</div>
        <div className="card-row-container">
          {chunkedWebtoons.map((chunk, index) => (
            <div key={index} className="card-row">
              {chunk.map((webtoon) => (
                <div key={webtoon} className="card-wrapper">
                  <Wcard webtoon={webtoon} />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default LPage;
