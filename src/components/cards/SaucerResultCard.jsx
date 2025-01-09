import { Image } from "..";

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
          <a href={result.url} target="_blank" rel="noreferrer">
            {result.url.slice(0, 67)}
            {result.url.length > 67 ? "..." : ""}
          </a>
        </p>
        <div></div>
      </div>
    </div>
  );
}
