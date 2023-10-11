import React, { useState } from "react";
import { Link } from "react-router-dom";
import "../styles/webtoonCard.css";

export default function Wcard({ webtoon }) {
  const [loaded, setLoaded] = useState(false);

  const stopRotate = () => {
    let s2 = document.getElementById(webtoon.title);
    s2.classList.remove("back");
    s2.classList.add("backloaded");
    setLoaded(true);
  };

  const update = (e) => {
    e.preventDefault();
    alert(`update: ${webtoon.title}`);
  };

  const download = (e) => {
    e.preventDefault();
    alert(`download: ${webtoon.title}`);
  };

  const remove = (e) => {
    e.preventDefault();
    alert(`remove: ${webtoon.title}`);
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
                  className="front-button"
                  id="info-btn"
                  state={{ backUrl: "library" }}
                ></Link>
                <a
                  href="# "
                  id="update-btn"
                  className="front-button"
                  onClick={(e) => {
                    update(e);
                  }}
                >
                  {" "}
                </a>
                <a
                  href="# "
                  id="download-btn"
                  className="front-button"
                  onClick={(e) => {
                    download(e);
                  }}
                >
                  {" "}
                </a>
                <a
                  href="# "
                  id="remove-btn"
                  className="front-button"
                  onClick={(e) => {
                    remove(e);
                  }}
                >
                  {" "}
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
