import "./../App.css";
import React, { useState, useEffect } from "react";
import "./Webtoon.css";
import Infoed from "./../components/infoed";
import get_info from "../api/get_info";

const Doujin = ({module, url}) => {
  const [webtoon, setWebtoon] = useState({});

  useEffect(() => {
    const fetchDoujin = async () => {
      const response = await get_info(module, url);
      setWebtoon(response);
    };
    fetchDoujin();
  },);

  return (
    <div className="container">
      <div className="basic-info">
        <div className="fixed">
          <img src={webtoon.cover} alt="" />
          {webtoon.rating}
          <span className="fa fa-star checked rate"></span>
          <br />
          Status: {webtoon.status}
        </div>
        <div className="flex-item">
          <div className="title-sec">
            <div className="title">{webtoon.title}</div>
            <div className="alternatives">{webtoon.alternative}</div>
          </div>
          <div className="summary-sec">
            <Infoed title="summary" info={webtoon.summary} />            
          </div>
          <div className="info-sec">
            <Infoed title="authors" info={webtoon.authors} />
            <Infoed title="artists" info={webtoon.artists} />            
            <Infoed title="posted on" info={webtoon["posted on"]} />
            <Infoed title="updated on" info={webtoon["updated on"]} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default Doujin;
