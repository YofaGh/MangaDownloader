import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useSheller, useSuccessNotification } from "../Provider";
import { Manga, Doujin } from "../components";

export default function Webtoon({
  addWebtoonToQueue,
  favorites,
  setFavorites,
  addLibraryMessage,
  library,
}) {
  const { module, url } = useParams();
  const [moduleType, setModuleType] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInLibrary, setIsInLibrary] = useState(false);
  const dispatchSuccess = useSuccessNotification();
  const sheller = useSheller();
  useEffect(() => {
    const fetchModuleType = async () => {
      const response = await sheller(["get_module_type", module]);
      setModuleType(response);
      setIsFavorite(
        favorites.some(
          (webtoon) => webtoon.id === `${response}_$_${module}_$_${url}`
        )
      );
      if (response === "Manga") {
        setIsInLibrary(
          library.some(
            (webtoon) => webtoon.url === url && webtoon.domain === module
          )
        );
      }
    };
    fetchModuleType();
  });

  const updateWebtoon = ({ title, cover }) => {
    if (isFavorite) {
      setFavorites((prevFavorites) =>
        prevFavorites.filter(
          (webtoon) => webtoon.id !== `${moduleType}_$_${module}_$_${url}`
        )
      );
      dispatchSuccess(`Removed ${title} from favorites`);
      setIsFavorite(false);
    } else {
      if (
        !favorites.some((wt) => wt.id === `${moduleType}_$_${module}_$_${url}`)
      ) {
        setFavorites((prevFavorites) => [
          ...prevFavorites,
          { title, id: `${moduleType}_$_${module}_$_${url}`, cover },
        ]);
        dispatchSuccess(`Added ${title} to favorites`);
      }
      setIsFavorite(true);
    }
  };

  return moduleType === "Manga" ? (
    <Manga
      module={module}
      url={url}
      addWebtoonToQueue={addWebtoonToQueue}
      isFavorite={isFavorite}
      updateWebtoon={updateWebtoon}
      addLibraryMessage={addLibraryMessage}
      isInLibrary={isInLibrary}
      library={library}
    />
  ) : (
    <Doujin
      module={module}
      url={url}
      addWebtoonToQueue={addWebtoonToQueue}
      isFavorite={isFavorite}
      updateWebtoon={updateWebtoon}
    />
  );
}
