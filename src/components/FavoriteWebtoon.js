import { useState } from "react";
import { retrieveImage } from ".";
import { useNotificationStore } from "../store";
import { invoke } from "@tauri-apps/api/core";

export default function FavoriteWebtoon({
  webtoon,
  removeFromFavorites,
  load_covers,
}) {
  const { addNotification } = useNotificationStore();
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
                  removeFromFavorites(webtoon.id);
                  addNotification(`Removed ${webtoon.title} from favorites`, "SUCCESS");
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
