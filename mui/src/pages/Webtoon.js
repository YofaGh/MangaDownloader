import "./../App.css";
import React, { useState, useEffect } from "react";
import { useParams, useLocation } from "react-router-dom";
import get_module_type from "../api/get_module_type";
import Manga from "./../components/Manga";
import Doujin from "./../components/Doujin";

function Webtoon() {
  const { module, url } = useParams();
  const { state } = useLocation();
  //backUrl = state.backUrl
  const [moduleType, setModuleType] = useState("");
  useEffect(() => {
    const fetchModuleType = async () => {
      const response = await get_module_type(module);
      setModuleType(response);
    };
    fetchModuleType();
  });
  switch (moduleType) {
    case "Manga":
      return <Manga module={module} url={url} />;
    case "Doujin":
      return <Doujin module={module} url={url} />;
    default:
      return <></>;
  }
}

export default Webtoon;
