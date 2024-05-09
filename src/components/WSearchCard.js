import { useState } from "react";
import { Link } from "react-router-dom";
import { retrieveImage } from ".";
import { invoke } from "@tauri-apps/api/tauri";

export default function WSearchCard({ webtoon, load_covers }) {
  const [imageSrc, setImageSrc] = useState(
    load_covers ? webtoon.thumbnail : "./assets/default-cover.svg"
  );

  return (
    <Link
      to={
        webtoon.url
          ? `/${webtoon.domain}/webtoon/${webtoon.url}`
          : `/${webtoon.domain}/webtoon/${webtoon.code}`
      }
      style={{ textDecoration: "none" }}
    >
      <div className="search-card">
        <img
          className="search-i"
          alt=""
          src={imageSrc}
          onError={() => {
            retrieveImage(
              imageSrc,
              webtoon.domain,
              setImageSrc,
              invoke,
              "./assets/default-cover.svg"
            );
          }}
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
