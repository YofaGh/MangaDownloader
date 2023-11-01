import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../styles/WSearchCard.css";

export default function WSearchCard({ webtoon }) {
  const [imageWidth, setImageWidth] = useState(0);
  const imageHeight = 220;

  useEffect(() => {
    const calculateImageWidth = () => {
      const image = new Image();
      image.src = webtoon.thumbnail;
      image.onload = () => {
        const aspectRatio = image.height / image.width;
        const calculatedWidth = imageHeight / aspectRatio;
        setImageWidth(calculatedWidth);
      };
    };

    if (webtoon.thumbnail) {
      calculateImageWidth();
    }
  }, [webtoon.thumbnail]);

  const fixedStyle = {
    width: `${imageWidth}px`,
    height: `${imageHeight}px`,
    backgroundImage: `url(${webtoon.thumbnail})`,
    backgroundSize: "cover",
    backgroundPosition: "center",
    float: "left",
    left: 0,
    borderTopLeftRadius: "20%",
    borderBottomLeftRadius: "20%",
    objectFit: "fill",
    maxWidth: "150px",
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
        <div style={fixedStyle}></div>
        <div className="info-searched-w">
          <h3>{webtoon.name.slice(0, 100)}{webtoon.name.length > 100 ? "..." : ""}</h3>
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
