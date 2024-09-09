import { useState } from "react";
import { useParams } from "react-router-dom";
import { WebtoonType } from "../utils";
import { Manga, Doujin } from "../components";
import {
  useModulesStore,
  useFavoritesStore,
  useNotificationStore,
} from "../store";

export default function Webtoon() {
  const { module, url } = useParams();
  const { favorites, addToFavorites, removeFromFavorites } =
    useFavoritesStore();
  const moduleType = useModulesStore((state) => state.modules).find(
    (m) => m.domain === module
  ).type;
  const id = `${moduleType}_$_${module}_$_${url}`;
  const [isFavorite, setIsFavorite] = useState(
    favorites.some((webtoon) => webtoon.id === id)
  );
  const favoritesSvg = isFavorite ? "favorites" : "favorites-outlined";
  const addSuccessNotification = useNotificationStore(
    (state) => state.addSuccessNotification
  );

  const toggleFavoriteWebtoon = (title, cover) => {
    if (isFavorite) {
      removeFromFavorites(id);
      addSuccessNotification(`Removed ${title} from favorites`);
    } else {
      addToFavorites({ id, title, cover });
      addSuccessNotification(`Added ${title} to favorites`);
    }
    setIsFavorite(!isFavorite);
  };

  return moduleType === WebtoonType.MANGA ? (
    <Manga
      module={module}
      url={url}
      favoritesSvg={favoritesSvg}
      toggleFavoriteWebtoon={toggleFavoriteWebtoon}
    />
  ) : (
    <Doujin
      module={module}
      url={url}
      favoritesSvg={favoritesSvg}
      toggleFavoriteWebtoon={toggleFavoriteWebtoon}
    />
  );
}
