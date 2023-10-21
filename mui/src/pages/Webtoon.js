import "./../App.css";
import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import get_module_type from "../api/get_module_type";
import Manga from "./../components/Manga";
import Doujin from "./../components/Doujin";

function Webtoon({ addWebtoon, favorites, setFavorites }) {
  const { module, url } = useParams();
  const { state } = useLocation();
  //backUrl = state.backUrl
  const [moduleType, setModuleType] = useState("");
  const [isFavorite, setIsFavorite] = useState(false);
  useEffect(() => {
    const fetchModuleType = async () => {
      const response = await get_module_type(module);
      setModuleType(response);
      setIsFavorite(
        favorites.some(
          (webtoon) => webtoon.id === `${response}_$_${module}_$_${url}`
        )
      );
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
          addWebtoon={addWebtoon}
          isFavorite={isFavorite}
          updateWebtoon={updateWebtoon}
        />
      );
    case "Doujin":
      return (
        <Doujin
          module={module}
          url={url}
          addWebtoon={addWebtoon}
          isFavorite={isFavorite}
          updateWebtoon={updateWebtoon}
        />
      );
    default:
      return <></>;
  }
}

export default Webtoon;
