import { useState } from "react";
import { Link } from "react-router-dom";
import { useSheller } from "../ShellerProvider";

export default function WSearchCard({ webtoon, loadCovers }) {
  const sheller = useSheller();
  const [imageSrc, setImageSrc] = useState(
    loadCovers ? webtoon.thumbnail : "./assets/default-cover.svg"
  );
  const get_cover = async () => {
    try {
      const response = await sheller([
        "retrieve_image",
        webtoon.domain,
        imageSrc,
      ]);
      setImageSrc(response);
    } catch {
      setImageSrc("./assets/default-cover.svg");
    }
  };
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
