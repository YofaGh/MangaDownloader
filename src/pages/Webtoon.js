import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  useNotificationStore,
  useFavoritesStore,
  useModulesStore,
} from "../store";
import { Manga, Doujin } from "../components";

export default function Webtoon() {
  const { module, url } = useParams();
  const [isFavorite, setIsFavorite] = useState(false);
  const { addNotification } = useNotificationStore();
  const { favorites, addToFavorites, removeFromFavorites } =
    useFavoritesStore();
  const moduleType = useModulesStore(state => state.modules).find(m => m.name === module).type;

  useEffect(() => {
    setIsFavorite(
      favorites.some(
        (webtoon) => webtoon.id === `${moduleType}_$_${module}_$_${url}`
      )
    );
  }, []);

  const updateWebtoon = ({ title, cover }) => {
    if (isFavorite) {
      removeFromFavorites(`${moduleType}_$_${module}_$_${url}`);
      addNotification(`Removed ${title} from favorites`, "SUCCESS");
      setIsFavorite(false);
    } else {
      if (
        !favorites.some((wt) => wt.id === `${moduleType}_$_${module}_$_${url}`)
      ) {
        addToFavorites({
          title,
          id: `${moduleType}_$_${module}_$_${url}`,
          cover,
        });
        addNotification(`Added ${title} to favorites`, "SUCCESS");
      }
      setIsFavorite(true);
    }
  };

  return moduleType === "Manga" ? (
    <Manga
      module={module}
      url={url}
      isFavorite={isFavorite}
      updateWebtoon={updateWebtoon}
    />
  ) : (
    <Doujin
      module={module}
      url={url}
      isFavorite={isFavorite}
      updateWebtoon={updateWebtoon}
    />
  );
}
