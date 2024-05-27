export default function SaucerResult({ result, load_covers }) {
  return (
    <div className="sr-card">
      <img
        alt=""
        className="sr-img"
        src={load_covers ? result.image : "./assets/default-cover.svg"}
      ></img>
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
