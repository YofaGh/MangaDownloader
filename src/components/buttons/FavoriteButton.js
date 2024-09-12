import { useState } from "react";
import { Icon } from "..";
import { useFavoritesStore, useNotificationStore } from "../../store";

export default function FavoriteButton({ id, title, cover }) {
  const { favorites, addToFavorites, removeFromFavorites } =
    useFavoritesStore();
  const [isFavorite, setIsFavorite] = useState(
    favorites.some((webtoon) => webtoon.id === id)
  );
  const addSuccessNotification = useNotificationStore(
    (state) => state.addSuccessNotification
  );
  const addWentoonToFavorites = () => {
    addToFavorites({ id, title, cover });
    addSuccessNotification(`Added ${title} to favorites`);
    setIsFavorite(true);
  };
  const removeWentoonFromFavorites = (e) => {
    e.preventDefault();
    removeFromFavorites(id);
    addSuccessNotification(`Removed ${title} from favorites`);
    setIsFavorite(false);
  };

  return isFavorite ? (
    <button className="buttonh buttonht" onClick={removeWentoonFromFavorites}>
      <Icon svgName="favorites" className="icongt" />
    </button>
  ) : (
    <button className="buttonh buttonht" onClick={addWentoonToFavorites}>
      <Icon svgName="favorites-outlined" className="icongt" />
    </button>
  );
}
