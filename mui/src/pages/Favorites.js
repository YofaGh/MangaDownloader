import { Link } from "react-router-dom";
import "../styles/Favorites.css";

export default function Favorites({ favorites, setFavorites }) {
  return (
    <div className="container">
      <div className="f-header">Favorites:</div>
      <div className="f-container">
        {favorites.map((webtoon) => (
          <Link
            to={`/${webtoon.id.split("_$_")[1]}/webtoon/${
              webtoon.id.split("_$_")[2]
            }`}
            key={webtoon.id}
          >
            <div className="f-card">
              <div className="f-content">
                <div className="f-backloaded" id={webtoon.title}>
                  <div className="f-back-content">
                    <div className="f-tey">
                      <img src={webtoon.cover} alt="" className="f-img-back" />
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
          </Link>
        ))}
      </div>
    </div>
  );
}
