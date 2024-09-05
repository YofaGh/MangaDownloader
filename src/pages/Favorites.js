import { Link } from "react-router-dom";
import { FavoriteWebtoon } from "../components";
import { useFavoritesStore } from "../store";

export default function Favorites() {
  const { favorites, removeFromFavorites } = useFavoritesStore();
  return (
    <div className="container">
      <div className="App-header">
        <h1>Favorites</h1>
      </div>
      <div className="f-container">
        {favorites.map((webtoon) => (
          <Link
            to={`/${webtoon.id.split("_$_")[1]}/webtoon/${
              webtoon.id.split("_$_")[2]
            }`}
            key={webtoon.id}
          >
            <FavoriteWebtoon
              webtoon={webtoon}
              removeFromFavorites={removeFromFavorites}
            />
          </Link>
        ))}
      </div>
    </div>
  );
}
