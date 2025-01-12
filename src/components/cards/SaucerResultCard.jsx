import { Image } from "..";
import { openUrl } from "../../utils";

export default function SaucerResult({ result }) {
  return (
    <div className="sr-card">
      <Image className="sr-img" src={result.image} />
      <div className="sr-textBox">
        <div className="sr-textContent">
          <p className="sr-h1">
            {result.site[0].toUpperCase() + result.site.slice(1)}
          </p>
        </div>
        <p className="sr-p">
          <span href={() => openUrl(result.url)}>
            {result.url.slice(0, 67)}
            {result.url.length > 67 ? "..." : ""}
          </span>
        </p>
        <div></div>
      </div>
    </div>
  );
}
