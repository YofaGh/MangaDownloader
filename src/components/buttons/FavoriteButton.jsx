import { useState } from "react";
import { Icon } from "..";
import { useFavoritesStore, useNotificationStore } from "../../store";

export default function FavoriteButton({ id, title, cover }) {
  const { favorites, addToFavorites, removeFromFavorites } =
    useFavoritesStore();
  const [isFavorite, setIsFavorite] = useState(
    favorites.some((webtoon) => webtoon.id === id)
  );
  const notifySuccess = useNotificationStore((state) => state.notifySuccess);
  const addWentoonToFavorites = () => {
    addToFavorites({ id, title, cover });
    notifySuccess(`Added ${title} to favorites`);
    setIsFavorite(true);
  };
  const removeWentoonFromFavorites = (e) => {
    e.preventDefault();
    removeFromFavorites(id);
    notifySuccess(`Removed ${title} from favorites`);
    setIsFavorite(false);
  };

  return isFavorite ? (
    <button className="buttonh buttonht" onClick={removeWentoonFromFavorites}>
      <Icon svgName="heart" className="icongt" />
    </button>
  ) : (
    <button className="buttonh buttonht" onClick={addWentoonToFavorites}>
      <Icon svgName="heart-broken" className="icongt" />
    </button>
  );
}
