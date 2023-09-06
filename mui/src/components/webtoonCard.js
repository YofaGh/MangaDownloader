import React, { useState, useEffect } from "react";
import get_info from "../api/get_info";
import "./webtoonCard.css";

export default function Wcard({ webtoon_raw }) {
  const [webtoon, setWebtoon] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [lastDownloadedChapter, setLastDownloadedChapter] = useState("");

  const stopRotate = () => {
    let s2 = document.getElementById(webtoon_raw.title);
    s2.classList.remove("back");
    s2.classList.add("backloaded");
    setLoaded(true);
  };

  const info = (e) => {
    e.preventDefault();
    alert(`info: ${webtoon_raw.title}`)
  }

  const update = (e) => {
    e.preventDefault();
    alert(`update: ${webtoon_raw.title}`)
  }

  const download = (e) => {
    e.preventDefault();
    alert(`download: ${webtoon_raw.title}`)
  }

  const remove = (e) => {
    e.preventDefault();
    alert(`remove: ${webtoon_raw.title}`)
  }

  useEffect(() => {
    const fetchWebtoon = async () => {
      const response = await get_info(webtoon_raw.domain, webtoon_raw.url);
      setWebtoon(response);
      setLastDownloadedChapter(webtoon_raw.last_downloaded_chapter);
    };
    fetchWebtoon();
  }, [webtoon_raw]);

  return (
    <div className="cont">
      <div className="card">
        <div className="content">
          <div className="back" id={webtoon_raw.title}>
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
                {lastDownloadedChapter}
              </div>
            </div>
          </div>
          {loaded && (
            <div className="front">
              <div className="img">
                <img src={webtoon.cover} alt="" className="img-front" />
              </div>
              <div className="front-content">
                <small className="badge">{webtoon_raw.domain}</small>
              </div>
              <div className="front-buttons">
                <a href="# " id="info-btn" className="front-button" onClick={(e) => {info(e)}}> </a>
                <a href="# " id="update-btn" className="front-button" onClick={(e) => {update(e)}}> </a>
                <a href="# " id="download-btn"  className="front-button" onClick={(e) => {download(e)}}> </a>
                <a href="# " id="remove-btn" className="front-button" onClick={(e) => {remove(e)}}> </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
