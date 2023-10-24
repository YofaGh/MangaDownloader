import "../styles/Saucer.css";

export default function SaucerResult({ result }) {
  return (
    <div class="sr-card">
      <img alt="" class="sr-img" src={result.image}></img>
      <div class="sr-textBox">
        <div class="sr-textContent">
          <p class="sr-h1">{result.site[0].toUpperCase() + result.site.slice(1)}</p>
        </div>
        <p class="sr-p">
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
