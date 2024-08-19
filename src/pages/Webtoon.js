import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { invoke } from "@tauri-apps/api/core";
import {
  useNotificationStore,
  useFavoritesStore,
  useLibraryStore,
} from "../store";
import { Manga, Doujin } from "../components";

export default function Webtoon() {
  const { module, url } = useParams();
  const [moduleType, setModuleType] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInLibrary, setIsInLibrary] = useState(false);
  const { addNotification } = useNotificationStore();
  const { favorites, addToFavorites, removeFromFavorites } =
    useFavoritesStore();
  const { library } = useLibraryStore();

  useEffect(() => {
    const fetchModuleType = async () => {
      const response = await invoke("get_module_type", { domain: module });
      setModuleType(response);
      setIsFavorite(
        favorites.some(
          (webtoon) => webtoon.id === `${response}_$_${module}_$_${url}`
        )
      );
      if (response === "Manga") {
        setIsInLibrary(
          library.some((webtoon) => webtoon.id === `${module}_$_${url}`)
        );
      }
    };
    fetchModuleType();
  });

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
      isInLibrary={isInLibrary}
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
