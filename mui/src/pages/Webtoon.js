import "./../App.css";
import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import get_module_type from "../api/get_module_type";
import Manga from "./../components/Manga";
import Doujin from "./../components/Doujin";

function Webtoon({
  addWebtoonToQueue,
  favorites,
  setFavorites,
  addLibraryMessage,
  library,
}) {
  const { module, url } = useParams();
  const { state } = useLocation();
  //backUrl = state.backUrl
  const [moduleType, setModuleType] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  const [isInLibrary, setIsInLibrary] = useState(false);
  useEffect(() => {
    const fetchModuleType = async () => {
      const response = await get_module_type(module);
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
      setIsFavorite(false);
    } else {
      if (
        !favorites.some((wt) => wt.id === `${moduleType}_$_${module}_$_${url}`)
      ) {
        setFavorites((prevFavorites) => [
          ...prevFavorites,
          { title, id: `${moduleType}_$_${module}_$_${url}`, cover },
        ]);
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
        />
      );
    default:
      return <></>;
  }
}

export default Webtoon;
