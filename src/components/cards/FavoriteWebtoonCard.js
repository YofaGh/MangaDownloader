import { Image, FavoriteButton } from "..";

export default function FavoriteWebtoon({ webtoon }) {
  return (
    <div className="f-card">
      <div className="f-content">
        <div className="f-backloaded" id={webtoon.title}>
          <div className="f-back-content">
            <div className="f-tey">
              <Image
                src={webtoon.cover}
                className="f-img-back"
                domain={webtoon.id.split("_$_")[1]}
              />
            </div>
            <div className="f-infoo">
              <FavoriteButton id={webtoon.id} title={webtoon.title} />
            </div>
            <div className="f-info">{webtoon.title}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
