import { Link } from "react-router-dom";
import { useFavoritesStore } from "../store";
import { FavoriteWebtoonCard } from "../components";

export default function Favorites() {
  return (
    <div className="container">
      <div className="App-header">
        <h1>Favorites</h1>
      </div>
      <div className="f-container">
        {useFavoritesStore((state) => state.favorites).map((webtoon) => (
          <Link
            key={webtoon.id}
            to={`/${webtoon.id.split("_$_")[1]}/webtoon/${
              webtoon.id.split("_$_")[2]
            }`}
          >
            <FavoriteWebtoonCard webtoon={webtoon} />
          </Link>
        ))}
      </div>
    </div>
  );
}
