import "./../App.css";
import React, { useState, useEffect } from "react";
import "./Webtoon.css";
import Infoed from "./../components/infoed";
import get_info from "../api/get_info";

const Doujin = ({ module, url }) => {
  const [webtoon, setWebtoon] = useState({});

  useEffect(() => {
    const fetchDoujin = async () => {
      const response = await get_info(module, url);
      setWebtoon(response);
    };
    fetchDoujin();
  });

  return <div className="container"></div>;
};

export default Doujin;
