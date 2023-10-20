import React, { useState } from "react";
import { Link } from "react-router-dom";
import get_chapters from "../api/get_chapters";
import "../styles/webtoonCard.css";

export default function Wcard({ webtoon, addWebtoon, addLibraryMessage }) {
  const [loaded, setLoaded] = useState(false);

  const stopRotate = () => {
    let s2 = document.getElementById(webtoon.title);
    s2.classList.remove("back");
    s2.classList.add("backloaded");
    setLoaded(true);
  };

  const download = async () => {
    const allChapters = await get_chapters(webtoon.domain, webtoon.url);
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
      chaptersToDownload += allChapters;
    }
    for (const chapter of chaptersToDownload) {
      addWebtoon({
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

  const remove = () => {
    addLibraryMessage({
      removeWebtoon: {
        domain: webtoon.domain,
        url: webtoon.url,
      },
    });
  };

  return (
    <div className="cont">
      <div className="card">
        <div className="content">
          <div className="back" id={webtoon.title}>
            <div className="back-content">
              <div className="tey">
                <img
                  src={webtoon.cover}
                  alt=""
                  className="img-back"
                  onLoad={stopRotate}
                  onError={stopRotate}
                />
              </div>
              <div className="info">
                {webtoon.title}
                <br></br>
                {webtoon.last_downloaded_chapter.name}
              </div>
            </div>
          </div>
          {loaded && (
            <div className="front">
              <div className="img">
                <img src={webtoon.cover} alt="" className="img-front" />
              </div>
              <div className="front-content">
                <small className="badge">{webtoon.domain}</small>
              </div>
              <div className="front-buttons">
                <Link
                  to={`/${webtoon.domain}/webtoon/${webtoon.url}`}
                  state={{ backUrl: "library" }}
                >
                  <button className="mm-button info-btn">
                    <img
                      alt=""
                      src="./assets/info.svg"
                      className="btn-icon-n"
                      style={{ width: "30px" }}
                    ></img>
                  </button>
                </Link>
                <button className="mm-button update-btn" onClick={download}>
                  <img
                    alt=""
                    src="./assets/download.svg"
                    className="btn-icon-n"
                    style={{ width: "30px" }}
                  ></img>
                </button>
                <button className="mm-button remove-btn" onClick={remove}>
                  <img
                    alt=""
                    src="./assets/trash.svg"
                    className="btn-icon-n"
                    style={{ width: "30px" }}
                  ></img>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
