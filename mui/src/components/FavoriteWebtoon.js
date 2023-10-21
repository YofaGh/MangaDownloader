import React, { useState } from "react";
import { retrieveImage } from "../api/utils";
import "../styles/FavoriteWebtoon.css";

export default function FavoriteWebtoon({ webtoon, setFavorites }) {
  const [imageSrc, setImageSrc] = useState(webtoon.cover);
  const get_cover = async () => {
    const response = await retrieveImage(webtoon.id.split("_$_")[1], webtoon.cover);
    setImageSrc(response);
  };
  return (
    <div className="f-card">
      <div className="f-content">
        <div className="f-backloaded" id={webtoon.title}>
          <div className="f-back-content">
            <div className="f-tey">
              <img src={imageSrc} alt="" className="f-img-back" onError={get_cover}/>
            </div>
            <div className="f-infoo">
              <button
                className="buttonht"
                onClick={() => {
                  setFavorites((prevFavorites) =>
                    prevFavorites.filter((wt) => wt.id !== webtoon.id)
                  );
                }}
              >
                <img
                  alt=""
                  src={"./assets/favorites.svg"}
                  className="icongt"
                ></img>
              </button>
            </div>
            <div className="f-info">{webtoon.title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
