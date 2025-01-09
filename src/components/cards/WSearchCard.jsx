import { Link } from "react-router-dom";
import { Image } from "..";

export default function WSearchCard({ webtoon }) {
  return (
    <Link to={`/${webtoon.domain}/webtoon/${webtoon.url || webtoon.code}`}>
      <div className="search-card">
        <Image
          className="search-i"
          src={webtoon.thumbnail}
          domain={webtoon.domain}
        />
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
