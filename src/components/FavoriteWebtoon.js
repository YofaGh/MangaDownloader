import { Image, Icon } from ".";
import { useNotificationStore } from "../store";

export default function FavoriteWebtoon({ webtoon, removeFromFavorites }) {
  const addSuccessNotification = useNotificationStore(
    (state) => state.addSuccessNotification
  );

  return (
    <div className="f-card">
      <div className="f-content">
        <div className="f-backloaded" id={webtoon.title}>
          <div className="f-back-content">
            <div className="f-tey">
              <Image
                src={webtoon.cover}
                className="f-img-back"
                domain={webtoon.id.split("_$_")[1]}
              />
            </div>
            <div className="f-infoo">
              <button
                className="buttonht"
                onClick={(e) => {
                  e.preventDefault();
                  removeFromFavorites(webtoon.id);
                  addSuccessNotification(
                    `Removed ${webtoon.title} from favorites`
                  );
                }}
              >
                <Icon svgName="favorites" className="icongt" />
              </button>
            </div>
            <div className="f-info">{webtoon.title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
