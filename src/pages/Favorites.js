import { Link } from "react-router-dom";
import { FavoriteWebtoon } from "../components";

export default function Favorites({ favorites, setFavorites, loadCovers }) {
  return (
    <div className="container">
      <div className="App-header"><h1>Favorites</h1></div>
      <div className="f-container">
        {favorites.map((webtoon) => (
          <Link
            to={`/${webtoon.id.split("_$_")[1]}/webtoon/${
              webtoon.id.split("_$_")[2]
            }`}
            key={webtoon.id}
          >
            <FavoriteWebtoon webtoon={webtoon} setFavorites={setFavorites} loadCovers={loadCovers}/>
          </Link>
        ))}
      </div>
    </div>
  );
}
