import React, { useState } from "react";
import "../styles/FavoriteWebtoon.css";
import { useNotification } from "../NotificationProvider";
import { useSheller } from "../ShellerProvider";

export default function FavoriteWebtoon({ webtoon, setFavorites, loadCovers }) {
  const dispatch = useNotification();
  const sheller = useSheller();
  const [imageSrc, setImageSrc] = useState(
    loadCovers ? webtoon.cover : "./assets/default-cover.svg"
  );
  const get_cover = async () => {
    try {
      const response = await sheller([
        " retrieveImage",
        webtoon.id.split("_$_")[1],
        webtoon.cover,
      ]);
      setImageSrc(response);
    } catch {
      setImageSrc("./assets/default-cover.svg");
    }
  };
  return (
    <div className="f-card">
      <div className="f-content">
        <div className="f-backloaded" id={webtoon.title}>
          <div className="f-back-content">
            <div className="f-tey">
              <img
                src={imageSrc}
                alt=""
                className="f-img-back"
                onError={get_cover}
              />
            </div>
            <div className="f-infoo">
              <button
                className="buttonht"
                onClick={(e) => {
                  e.preventDefault();
                  setFavorites((prevFavorites) =>
                    prevFavorites.filter((wt) => wt.id !== webtoon.id)
                  );
                  dispatch({
                    type: "SUCCESS",
                    message: `Removed ${webtoon.title} from favorites`,
                    title: "Successful Request",
                  });
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
