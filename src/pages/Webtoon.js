import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useNotification } from "../NotificationProvider";
import { useSheller } from "../ShellerProvider";
import { Manga, Doujin } from "./../components";

export default function Webtoon({
  addWebtoonToQueue,
  favorites,
  setFavorites,
  addLibraryMessage,
  library,
  loadCovers,
}) {
  const { module, url } = useParams();
  const [moduleType, setModuleType] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInLibrary, setIsInLibrary] = useState(false);
  const dispatch = useNotification();
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
      dispatch({
        type: "SUCCESS",
        message: `Removed ${title} from favorites`,
        title: "Successful Request",
      });
      setIsFavorite(false);
    } else {
      if (
        !favorites.some((wt) => wt.id === `${moduleType}_$_${module}_$_${url}`)
      ) {
        setFavorites((prevFavorites) => [
          ...prevFavorites,
          { title, id: `${moduleType}_$_${module}_$_${url}`, cover },
        ]);
        dispatch({
          type: "SUCCESS",
          message: `Added ${title} to favorites`,
          title: "Successful Request",
        });
      }
      setIsFavorite(true);
    }
  };

  switch (moduleType) {
    case "Manga":
      return (
        <Manga
          module={module}
          url={url}
          addWebtoonToQueue={addWebtoonToQueue}
          isFavorite={isFavorite}
          updateWebtoon={updateWebtoon}
          addLibraryMessage={addLibraryMessage}
          isInLibrary={isInLibrary}
          library={library}
          loadCovers={loadCovers}
        />
      );
    case "Doujin":
      return (
        <Doujin
          module={module}
          url={url}
          addWebtoonToQueue={addWebtoonToQueue}
          isFavorite={isFavorite}
          updateWebtoon={updateWebtoon}
          loadCovers={loadCovers}
        />
      );
    default:
      return <></>;
  }
}
