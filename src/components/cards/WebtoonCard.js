import { useState } from "react";
import { Link } from "react-router-dom";
import { retrieveImage } from "..";
import { invoke } from "@tauri-apps/api/core";

export default function Wcard({
  webtoon,
  addLibraryMessage,
  update,
  load_covers,
}) {
  const [loaded, setLoaded] = useState(false);
  const [imageSrc, setImageSrc] = useState(
    load_covers ? webtoon.cover : "./assets/default-cover.svg"
  );

  const stopRotate = () => {
    let s2 = document.getElementById(webtoon.title);
    s2.classList.remove("back");
    s2.classList.add("backloaded");
    setLoaded(true);
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
                  src={imageSrc}
                  alt=""
                  className="img-back"
                  onLoad={stopRotate}
                  onError={() => {
                    retrieveImage(
                      imageSrc,
                      module.domain,
                      setImageSrc,
                      invoke,
                      "./assets/default-cover.svg"
                    );
                  }}
                />
              </div>
              <div className="info">
                {webtoon.title}
                <br></br>
                {webtoon.last_downloaded_chapter
                  ? webtoon.last_downloaded_chapter.name
                  : ""}
              </div>
            </div>
          </div>
          {loaded && (
            <div className="front">
              <div className="img">
                <img src={imageSrc} alt="" className="img-front" />
              </div>
              <div className="front-content">
                <small className="badge">{webtoon.domain}</small>
              </div>
              <div className="front-buttons">
                <Link to={`/${webtoon.domain}/webtoon/${webtoon.url}`}>
                  <button className="mm-button info-btn">
                    <img
                      alt=""
                      src="./assets/info.svg"
                      className="btn-icon-n"
                      style={{ width: "30px" }}
                    ></img>
                  </button>
                </Link>
                <button
                  className="mm-button update-btn"
                  onClick={() => update(webtoon)}
                >
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
