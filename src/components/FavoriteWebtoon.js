import { useState } from "react";
import { retrieveImage } from ".";
import { useSuccessNotification } from "../Provider";
import { invoke } from "@tauri-apps/api/tauri";

export default function FavoriteWebtoon({
  webtoon,
  setFavorites,
  load_covers,
}) {
  const dispatchSuccess = useSuccessNotification();
  const [imageSrc, setImageSrc] = useState(
    load_covers ? webtoon.cover : "./assets/default-cover.svg"
  );

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
                onError={() => {
                  retrieveImage(
                    webtoon.cover,
                    webtoon.id.split("_$_")[1],
                    setImageSrc,
                    invoke,
                    "./assets/default-cover.svg"
                  );
                }}
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
                  dispatchSuccess(`Removed ${webtoon.title} from favorites`);
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
