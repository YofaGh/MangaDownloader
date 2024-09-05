import { useState } from "react";
import { useParams } from "react-router-dom";
import { WebtoonType } from "../utils";
import { Manga, Doujin } from "../components";
import {
  useNotificationStore,
  useFavoritesStore,
  useModulesStore,
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
  const { addSuccessNotification } = useNotificationStore();
  const favoritesSvg = isFavorite ? "favorites" : "favorites-outlined";

  const updateWebtoon = ({ title, cover }) => {
    if (isFavorite) {
      removeFromFavorites(id);
      addSuccessNotification(`Removed ${title} from favorites`);
      setIsFavorite(false);
    } else {
      if (!favorites.some((wt) => wt.id === id)) {
        addToFavorites({ title, id, cover });
        addSuccessNotification(`Added ${title} to favorites`);
      }
      setIsFavorite(true);
    }
  };

  return moduleType === WebtoonType.MANGA ? (
    <Manga
      module={module}
      url={url}
      favoritesSvg={favoritesSvg}
      updateWebtoon={updateWebtoon}
    />
  ) : (
    <Doujin
      module={module}
      url={url}
      favoritesSvg={favoritesSvg}
      updateWebtoon={updateWebtoon}
    />
  );
}
