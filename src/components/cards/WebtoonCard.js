import { useState } from "react";
import { Link } from "react-router-dom";
import { Image, Icon } from "..";
import { useLibraryStore, useNotificationStore } from "../../store";

export default function Wcard({ webtoon, update }) {
  const [imageSrc, setImageSrc] = useState();
  const [loaded, setLoaded] = useState(false);
  const { removeFromLibrary } = useLibraryStore();
  const addSuccessNotification = useNotificationStore(
    (state) => state.addSuccessNotification
  );

  const stopRotate = () => {
    let s2 = document.getElementById(webtoon.title);
    s2.classList.remove("back");
    s2.classList.add("backloaded");
    setImageSrc(document.getElementById(`WC-${webtoon.title}`).src);
    setLoaded(true);
  };

  return (
    <div className="cont">
      <div className="card">
        <div className="content">
          <div className="back" id={webtoon.title}>
            <div className="back-content">
              <div className="tey">
                <Image
                  src={webtoon.cover}
                  onLoad={stopRotate}
                  className="img-back"
                  id={`WC-${webtoon.title}`}
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
                <Image src={imageSrc} className="img-front" />
              </div>
              <div className="front-content">
                <small className="badge">{webtoon.domain}</small>
              </div>
              <div className="front-buttons">
                <Link to={`/${webtoon.domain}/webtoon/${webtoon.url}`}>
                  <button className="m-button m-button-big info-btn">
                    <Icon
                      svgName="info"
                      className="btn-icon"
                      style={{ width: "30px" }}
                    />
                  </button>
                </Link>
                <button
                  className="m-button m-button-big update-btn"
                  onClick={() => update(webtoon)}
                >
                  <Icon
                    svgName="download"
                    className="btn-icon"
                    style={{ width: "30px" }}
                  />
                </button>
                <button
                  className="m-button m-button-big remove-btn"
                  onClick={() => {
                    removeFromLibrary(webtoon.id);
                    addSuccessNotification(
                      `Removed ${webtoon.title} from Library`
                    );
                  }}
                >
                  <Icon
                    svgName="trash"
                    className="btn-icon"
                    style={{ width: "30px" }}
                  />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
