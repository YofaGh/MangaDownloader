import React, { useState } from "react";
import { Link } from "react-router-dom";
import { retrieveImage } from "../api/utils";
import "../styles/WSearchCard.css";

export default function WSearchCard({ webtoon }) {
  const [imageSrc, setImageSrc] = useState(webtoon.thumbnail);
  const get_cover = async () => {
    const response = await retrieveImage(webtoon.domain, imageSrc);
    setImageSrc(response);
  };
  return (
    <Link
      to={
        webtoon.url
          ? `/${webtoon.domain}/webtoon/${webtoon.url}`
          : `/${webtoon.domain}/webtoon/${webtoon.code}`
      }
      state={{ backUrl: "search" }}
      style={{ textDecoration: "none" }}
    >
      <div className="search-card">
        <img
          className="search-i"
          alt=""
          src={imageSrc}
          onError={get_cover}
        ></img>
        <div className="info-searched-w">
          <h3>
            {webtoon.name.slice(0, 100)}
            {webtoon.name.length > 100 ? "..." : ""}
          </h3>
          {webtoon.latest_chapter && <h4>{webtoon.latest_chapter}</h4>}
          {webtoon.code && <h4>{webtoon.code}</h4>}
        </div>
        <div className="search-info">
          <h3>{webtoon.domain}</h3>
          <h5>Page: {webtoon.page}</h5>
        </div>
      </div>
    </Link>
  );
}
